
'use client';

import { useState, useEffect } from 'react';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { useToast } from '@/hooks/use-toast';
import { Loader2, BookText, Plus, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createCaseLog, addCaseLogEntry } from '@/app/actions';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';

type CaseLog = {
    id: string;
    caseName: string;
    clientName: string;
    caseNumber?: string;
    updatedAt: { toDate: () => Date };
};

type CaseLogEntry = {
    id: string;
    entry: string;
    createdAt: { toDate: () => Date };
};

type CaseLogsProps = {
    lawyerId: string;
    viewOnly: boolean;
};

const caseLogSchema = z.object({
  caseName: z.string().min(1, "Case name is required."),
  clientName: z.string().min(1, "Client name is required."),
  caseNumber: z.string().optional(),
});

export default function CaseLogs({ lawyerId, viewOnly }: CaseLogsProps) {
  const [cases, setCases] = useState<CaseLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewCaseDialogOpen, setIsNewCaseDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof caseLogSchema>>({
    resolver: zodResolver(caseLogSchema),
    defaultValues: { caseName: '', clientName: '', caseNumber: '' },
  });

  useEffect(() => {
    const db = getFirestore(app);
    const casesRef = collection(db, 'users', lawyerId, 'caseLogs');
    const q = query(casesRef, orderBy('updatedAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const casesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CaseLog));
      setCases(casesData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching case logs:", err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch case logs.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [lawyerId, toast]);

  const onSubmit = async (values: z.infer<typeof caseLogSchema>) => {
    setIsSubmitting(true);
    const result = await createCaseLog(lawyerId, values);
    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Success', description: 'New case log created.' });
      form.reset();
      setIsNewCaseDialogOpen(false);
    }
    setIsSubmitting(false);
  };
  
  const CaseEntry = ({ caseItem }: { caseItem: CaseLog }) => {
    const [entries, setEntries] = useState<CaseLogEntry[]>([]);
    const [newEntry, setNewEntry] = useState("");
    const [isPosting, setIsPosting] = useState(false);
    const [entriesLoading, setEntriesLoading] = useState(true);

    useEffect(() => {
        const db = getFirestore(app);
        const entriesRef = collection(db, 'users', lawyerId, 'caseLogs', caseItem.id, 'entries');
        const q = query(entriesRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entriesData = snapshot.docs.map(doc => ({id: doc.id, ...doc.data() } as CaseLogEntry));
            setEntries(entriesData);
            setEntriesLoading(false);
        });
        return () => unsubscribe();
    }, [caseItem.id]);
    
    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEntry.trim()) return;

        setIsPosting(true);
        const result = await addCaseLogEntry(lawyerId, caseItem.id, newEntry);
        if ('error' in result) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
        } else {
            setNewEntry("");
        }
        setIsPosting(false);
    }

    return (
        <AccordionItem value={caseItem.id} key={caseItem.id}>
            <AccordionTrigger>
                <div>
                    <p className="font-semibold text-left">{caseItem.caseName}</p>
                    <p className="text-sm text-muted-foreground text-left">{caseItem.clientName} {caseItem.caseNumber && `(#${caseItem.caseNumber})`}</p>
                </div>
            </AccordionTrigger>
            <AccordionContent>
                <div className="space-y-4">
                     {!viewOnly && (
                        <form onSubmit={handleAddEntry} className="flex items-start gap-2">
                            <Textarea
                                value={newEntry}
                                onChange={e => setNewEntry(e.target.value)}
                                placeholder="Add new log entry..."
                                className="min-h-[60px]"
                                disabled={isPosting}
                            />
                            <Button type="submit" size="icon" disabled={isPosting || !newEntry.trim()}>
                                {isPosting ? <Loader2 className="animate-spin" /> : <Send />}
                            </Button>
                        </form>
                    )}
                    <ScrollArea className="h-64">
                         <div className="space-y-3 pr-4">
                            {entriesLoading ? <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin"/></div> 
                            : entries.length > 0 ? entries.map(entry => (
                                <div key={entry.id} className="p-3 rounded-md bg-background border text-sm">
                                    <p className="whitespace-pre-wrap">{entry.entry}</p>
                                    <p className="text-xs text-muted-foreground mt-2">{entry.createdAt.toDate().toLocaleString()}</p>
                                </div>
                            )) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No entries yet.</p>
                            )}
                         </div>
                    </ScrollArea>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BookText /> Case Logs
          </CardTitle>
          <CardDescription>Manage your ongoing cases and notes.</CardDescription>
        </div>
        {!viewOnly && (
            <Dialog open={isNewCaseDialogOpen} onOpenChange={setIsNewCaseDialogOpen}>
                <DialogTrigger asChild>
                    <Button size="sm"><Plus className="mr-2" /> New Case</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create New Case Log</DialogTitle>
                        <DialogDescription>Start a new log for a client or case.</DialogDescription>
                    </DialogHeader>
                     <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="caseName" render={({ field }) => (
                                <FormItem><FormLabel>Case Name / Type</FormLabel><FormControl><Input placeholder="e.g., Divorce Filing" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="clientName" render={({ field }) => (
                                <FormItem><FormLabel>Client Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="caseNumber" render={({ field }) => (
                                <FormItem><FormLabel>Case Number (Optional)</FormLabel><FormControl><Input placeholder="e.g., CV-2024-12345" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <DialogFooter>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 animate-spin"/>}
                                    Create Case
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : cases.length > 0 ? (
          <Accordion type="multiple" className="w-full">
            {cases.map((caseItem) => <CaseEntry key={caseItem.id} caseItem={caseItem} />)}
          </Accordion>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No case logs found.</p>
            {!viewOnly && <p className="text-sm">Click "New Case" to get started.</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
