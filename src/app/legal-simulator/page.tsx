'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Loader2, Save, Search, Trash2, Download, Bot } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { startNewRolePlay } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc, orderBy, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const DramaMaskIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="9" cy="12" r="1"/><path d="M8 20h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/>
        <path d="M12 20h2a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2"/>
        <circle cx="15" cy="12" r="1"/>
    </svg>
);

type RolePlaySession = {
    id: string;
    role: string;
    scenario: string;
    conversationSummary: string;
    createdAt: { toDate: () => Date };
};

export default function LegalSimulatorPage() {
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [role, setRole] = useState('');
    const [scenario, setScenario] = useState('');
    const [savedSessions, setSavedSessions] = useState<RolePlaySession[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (user) {
            const db = getFirestore(app);
            const sessionsRef = collection(db, 'users', user.uid, 'rolePlaySessions');
            const q = query(sessionsRef, orderBy('createdAt', 'desc'));
            
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const sessionsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RolePlaySession));
                setSavedSessions(sessionsData);
                setSessionsLoading(false);
            }, (error) => {
                console.error("Error fetching sessions:", error);
                toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch saved sessions.' });
                setSessionsLoading(false);
            });

            return () => unsubscribe();
        } else if (!authLoading) {
            setSessionsLoading(false);
        }
    }, [user, authLoading, toast]);


    const handleStartRolePlay = async () => {
        if (!user) return;
        setIsLoading(true);
        const result = await startNewRolePlay({ role, scenario, userId: user.uid });
        if ('error' in result) {
            toast({ variant: 'destructive', title: 'Error', description: result.error });
            setIsLoading(false);
        } else {
            // The onSnapshot listener will pick up the new session.
            // We can navigate to the chat page for that session.
            router.push(`/legal-simulator/${result.sessionId}`);
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!user) return;
        const db = getFirestore(app);
        try {
            await deleteDoc(doc(db, 'users', user.uid, 'rolePlaySessions', sessionId));
            toast({ title: 'Success', description: 'Session deleted.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete session.' });
        }
    };

    const handleDownloadSession = (session: RolePlaySession) => {
        const content = `Role-Play Session
--------------------
Role: ${session.role}
Scenario: ${session.scenario}
Date: ${session.createdAt.toDate().toLocaleString()}
--------------------
Summary:
${session.conversationSummary}
`;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session-${session.id}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (authLoading) {
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
                            You must be logged in to use the Legal Simulator.
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
    
    const filteredSessions = savedSessions.filter(s => s.scenario.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <main className="container mx-auto px-4 py-8 sm:py-12">
            <header className="mb-8 md:mb-12">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
                    <DramaMaskIcon className="h-8 w-8 text-primary" />
                    Simulated Legal Interview / Role-Play
                </h1>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Create New Simulation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Select Role</label>
                            <Select onValueChange={setRole} value={role}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select your role in the scenario" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="client">Client</SelectItem>
                                    <SelectItem value="lawyer">Lawyer</SelectItem>
                                    <SelectItem value="judge">Judge</SelectItem>
                                    <SelectItem value="witness">Witness</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="scenario" className="text-sm font-medium">Enter Scenario</label>
                            <Textarea
                                id="scenario"
                                placeholder="e.g. A client wants to file a domestic violence case"
                                value={scenario}
                                onChange={(e) => setScenario(e.target.value)}
                                className="min-h-[100px]"
                            />
                        </div>
                        <Button onClick={handleStartRolePlay} disabled={isLoading || !role || !scenario} className="w-full">
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Start Role-Play
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><Save className="h-5 w-5"/> Saved Sessions</CardTitle>
                        <div className="relative mt-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by scenario..." 
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessionsLoading ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin"/></div> 
                        : filteredSessions.length > 0 ? (
                           <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {filteredSessions.map(session => (
                                    <div key={session.id} className="p-4 rounded-lg border bg-secondary/50">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm">{session.role} | <span className="font-normal text-xs">{session.createdAt.toDate().toLocaleString()}</span></p>
                                                <p className="text-xs text-muted-foreground mt-1">Scenario: {session.scenario}</p>
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => router.push(`/legal-simulator/${session.id}`)} title="Continue Simulation">
                                                    <Bot className="h-4 w-4 text-primary"/>
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownloadSession(session)} title="Download Session">
                                                    <Download className="h-4 w-4"/>
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Delete Session">
                                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                            <AlertDialogDescription>This action cannot be undone. This will permanently delete the session.</AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSession(session.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                        <p className="text-sm mt-2 p-2 bg-background/50 rounded-md line-clamp-3">{session.conversationSummary}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No saved sessions found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
