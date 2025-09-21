'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, FileWarning } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ChatInterface from '@/components/chat-interface';

type HistoryDoc = {
    fileAsBase64: string;
    mimeType: string;
    fileName: string;
    // other fields from ClassifyDocumentOutput
};

export default function SimulatorPage({ params }: { params: { historyId: string } }) {
  const { user, loading: authLoading } = useAuth();
  const [historyDoc, setHistoryDoc] = useState<HistoryDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const fetchHistoryDoc = async () => {
        setLoading(true);
        setError(null);
        try {
          const db = getFirestore(app);
          const docRef = doc(db, 'users', user.uid, 'history', params.historyId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const data = docSnap.data() as HistoryDoc;
             if (!data.fileAsBase64 || !data.mimeType) {
                 setError("The document content for this analysis was not properly saved or is missing. This can happen with older analyses. Please re-analyze the document.");
             } else {
                setHistoryDoc(data);
             }
          } else {
            setError("Analysis not found. It may have been deleted or you may not have permission to view it.");
          }
        } catch (e) {
          console.error("Error fetching history document:", e);
          setError("An error occurred while trying to load your document analysis.");
        } finally {
          setLoading(false);
        }
      };
      fetchHistoryDoc();
    } else if (!authLoading) {
        setLoading(false);
        setError("You must be logged in to view this page.");
    }
  }, [user, authLoading, params.historyId]);

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error || !historyDoc) {
    return (
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive"><FileWarning/> Error</CardTitle>
            <CardDescription>
              {error || "Could not load the document for simulation."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary">
              <Link href="/history">Back to History</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
       <header className="p-4 border-b">
         <h1 className="text-lg font-semibold">AI Legal Simulator: <span className="text-muted-foreground">{historyDoc.fileName}</span></h1>
       </header>
       <ChatInterface 
          fileData={historyDoc} 
          initialMessages={[{role: 'assistant', content: `Hello! I'm LexiAI. I have your document "${historyDoc.fileName}" ready. What would you like to know? You can ask me to explain a clause, simulate a scenario, or clarify legal terms.`}]}
       />
    </div>
  );
}
