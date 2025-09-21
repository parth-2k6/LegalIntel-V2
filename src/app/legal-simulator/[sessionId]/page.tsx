'use client';

import { useAuth } from '@/hooks/use-auth';
import { Loader2, FileWarning, Bot, User, Send, Minus } from 'lucide-react';
import { useEffect, useState, useRef, use } from 'react';
import { getFirestore, doc, getDoc, collection, onSnapshot, query, orderBy, addDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { continueExistingRolePlay } from '@/app/actions';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

type RolePlaySession = {
    scenario: string;
    role: string;
    initialResponse: string;
    createdAt: { toDate: () => Date };
};

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
    createdAt?: Timestamp;
};

export default function RolePlayChatPage({ params }: { params: { sessionId: string } }) {
    const { user, loading: authLoading } = useAuth();
    const [session, setSession] = useState<RolePlaySession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newMessage, setNewMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { sessionId } = use(params);

    // Fetch session details
    useEffect(() => {
        if (user) {
            const db = getFirestore(app);
            const docRef = doc(db, 'users', user.uid, 'rolePlaySessions', sessionId);
            
            getDoc(docRef).then(docSnap => {
                if (docSnap.exists()) {
                    const sessionData = docSnap.data() as RolePlaySession;
                    setSession(sessionData);
                } else {
                    setError("Session not found.");
                }
            }).catch(e => {
                console.error("Error fetching session:", e);
                setError("An error occurred while loading the session.");
            });
        }
    }, [user, sessionId]);

    // Fetch chat messages
    useEffect(() => {
        if (user && session) {
            const db = getFirestore(app);
            const messagesRef = collection(db, 'users', user.uid, 'rolePlaySessions', sessionId, 'messages');
            const q = query(messagesRef, orderBy('createdAt'));

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedMessages: ChatMessage[] = snapshot.docs.map(doc => doc.data() as ChatMessage);
                
                // Start with the initial response if there are no messages yet
                const initialChat: ChatMessage[] = fetchedMessages.length > 0 ? [] : [{ role: 'assistant', content: session.initialResponse }];
                
                setMessages([...initialChat, ...fetchedMessages]);
                setLoading(false);
            }, (err) => {
                console.error("Error fetching messages:", err);
                setError("Failed to load chat history.");
                setLoading(false);
            });

            return () => unsubscribe();
        } else if (!authLoading && !session && !loading) {
            setError("Session data is missing.");
        }
    }, [user, session, sessionId, authLoading, loading]);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isResponding || !user || !session) return;

        setIsResponding(true);
        const userMessage: ChatMessage = { role: 'user', content: newMessage.trim(), createdAt: Timestamp.now() };
        setNewMessage('');

        const db = getFirestore(app);
        const messagesRef = collection(db, 'users', user.uid, 'rolePlaySessions', sessionId, 'messages');
        
        // Add user message to Firestore
        await addDoc(messagesRef, userMessage);
        
        // `onSnapshot` will update the UI with the user's message.
        // Now, call the AI.

        const systemPrompt = `You are an expert AI actor for legal role-playing simulations. You will play the opposite role of the user. For example, if the user is a "Client", you might be a "Lawyer".
Your goal is to create an immersive and realistic legal simulation.
User's Role: "${session.role}"
Scenario: "${session.scenario}"`;
        
        const fullChatHistory = [
            { role: 'system', content: systemPrompt },
            ...messages,
            userMessage
        ].map(({ role, content }) => ({ role, content }));

        const response = await continueExistingRolePlay({ messages: fullChatHistory as any[] });

        if ('error' in response) {
            const assistantErrorMessage: ChatMessage = { role: 'assistant', content: `Sorry, an error occurred: ${response.error}`, createdAt: Timestamp.now() };
            await addDoc(messagesRef, assistantErrorMessage);
        } else {
            const assistantResponseMessage: ChatMessage = { role: 'assistant', content: response.response, createdAt: Timestamp.now() };
            await addDoc(messagesRef, assistantResponseMessage);
        }
        setIsResponding(false);
    };

    if (loading || authLoading) {
        return <div className="flex justify-center items-center h-screen"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    if (error || !session) {
        return (
            <main className="container mx-auto px-4 py-8 sm:py-12">
                <Card className="max-w-xl mx-auto">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><FileWarning /> Error</CardTitle>
                        <CardDescription>{error || "Could not load the simulation session."}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary"><Link href="/legal-simulator">Back to Simulator</Link></Button>
                    </CardContent>
                </Card>
            </main>
        );
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] flex flex-col">
            <header className="p-4 border-b flex justify-between items-center">
                <div>
                    <h1 className="text-lg font-semibold">Legal Role-Play: <span className="text-muted-foreground">{session.scenario}</span></h1>
                    <p className="text-sm text-muted-foreground">You are playing as: {session.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => router.push('/legal-simulator')} title="Minimize Chat">
                    <Minus className="h-4 w-4" />
                </Button>
            </header>
            <div className={cn("flex flex-col h-full")}>
                <ScrollArea className="flex-grow h-0" ref={chatContainerRef}>
                    <div className="space-y-4 p-4">
                        {messages.map((message, index) => (
                            <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}>
                                {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-1" />}
                                <div className={cn("p-3 rounded-lg max-w-[85%] text-sm", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary')}>
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                </div>
                                {message.role === 'user' && <User className="h-6 w-6 text-muted-foreground flex-shrink-0 mt-1" />}
                            </div>
                        ))}
                        {isResponding && (
                            <div className="flex items-start gap-3">
                                <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                                <div className="p-3 rounded-lg bg-secondary">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="flex items-center gap-2 border-t p-4">
                    <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your response..."
                        disabled={isResponding}
                    />
                    <Button type="submit" size="icon" disabled={isResponding || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
