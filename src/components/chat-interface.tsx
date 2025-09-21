'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AskDocumentQuestionOutput } from '@/ai/flows/ask-document-question';
import { getSpeech, createTask } from '@/app/actions';
import { Loader2, Send, Bot, User, Volume2, Mic } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { ScrollArea } from './ui/scroll-area';
import { Input } from './ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useTask } from '@/hooks/use-task';
import { useToast } from '@/hooks/use-toast';

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string | AskDocumentQuestionOutput;
    audioUrl?: string;
};

type ChatInterfaceProps = {
    fileData: { fileAsBase64: string, mimeType: string, fileName: string };
    initialMessages?: ChatMessage[];
    className?: string;
};

const AssistantMessage = ({ message, audioUrl }: { message: AskDocumentQuestionOutput, audioUrl?: string }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const { analysis, confidenceScore, negotiationHelper, plainEnglish, riskHeatmapLabel, riskJustification, sources } = message;

    const playAudio = (audioUrl: string) => {
        if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
        }
    };

    const riskBadge = (riskLevel: 'Low' | 'Medium' | 'High' | 'Safe' | 'Caution' | 'High-Risk') => {
        const variants = {
            Low: 'default',
            Medium: 'secondary',
            High: 'destructive',
            Safe: 'default',
            Caution: 'secondary',
            'High-Risk': 'destructive'
        };
        const variantKey = riskLevel as keyof typeof variants;
        return <Badge variant={variants[variantKey] as 'default' | 'secondary' | 'destructive'}>{riskLevel}</Badge>;
    };

    return (
        <>
            <div className="p-3 rounded-lg bg-secondary space-y-4">
                <div>
                    <div className="flex items-center justify-between">
                         <p className="text-sm font-semibold font-display mb-1">Plain English</p>
                         {audioUrl && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => playAudio(audioUrl)}>
                                <Volume2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    <p className="text-sm">{plainEnglish}</p>
                </div>

                <div className="p-3 rounded-md border bg-background/50">
                    <p className="text-sm font-semibold font-display mb-2">Analysis</p>
                    <div className="space-y-2 text-xs">
                        <div className="flex justify-between"><span>Parties:</span> <span>{analysis.parties.join(', ')}</span></div>
                        <div className="flex justify-between"><span>Severity:</span> {riskBadge(analysis.severity)}</div>
                        <p>Justification: {analysis.severityJustification}</p>
                        <div><p className="font-medium">Obligations:</p> <ul className="list-disc pl-4"> {analysis.obligations.map((o, i) => <li key={i}>{o}</li>)}</ul></div>
                        <div><p className="font-medium">Deadlines/Penalties:</p> <ul className="list-disc pl-4"> {analysis.deadlinesOrPenalties.map((dp, i) => <li key={i}>{dp}</li>)}</ul></div>
                        <div><p className="font-medium">Rights Waived/Gained:</p> <ul className="list-disc pl-4"> {analysis.rightsWaivedOrGained.map((r, i) => <li key={i}>{r}</li>)}</ul></div>
                    </div>
                </div>

                <div className="p-3 rounded-md border bg-background/50">
                    <p className="text-sm font-semibold font-display mb-2">Negotiation Tip</p>
                    <div className="space-y-2 text-xs">
                        <p className="font-medium">Suggested Alternative:</p>
                        <p className="border-l-2 pl-2 italic">{negotiationHelper.alternativeClause}</p>
                        <p className="font-medium">Message Template:</p>
                        <p className="border-l-2 pl-2 italic">{negotiationHelper.messageTemplate}</p>
                    </div>
                </div>
                
                <div className="p-3 rounded-md border bg-background/50">
                    <p className="text-sm font-semibold font-display mb-2">Sources & Confidence</p>
                    <div className="space-y-2 text-xs">
                        <div className="flex items-center gap-2">
                            <Progress value={confidenceScore} className="h-2 w-24" />
                            <span>{confidenceScore}% Confidence</span>
                        </div>
                        <div>
                        <p className="font-medium">Cited from document:</p>
                        {sources.map((s, i) => <blockquote key={i} className="border-l-2 pl-2 italic mt-1 text-muted-foreground">{s}</blockquote>)}
                        </div>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground text-center pt-2 border-t">This is an AI-powered simplification, not legal advice.</p>
            </div>
            <audio ref={audioRef} className="hidden" />
        </>
    );
};

export default function ChatInterface({ fileData, initialMessages = [], className }: ChatInterfaceProps) {
    const { user } = useAuth();
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialMessages);
    const [question, setQuestion] = useState('');
    const { toast } = useToast();
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const onTaskUpdate = async (task: any) => {
        if (task.status === 'completed') {
            const response = task.result as AskDocumentQuestionOutput;
            const speechResponse = await getSpeech(response.plainEnglish);
            const audioUrl = 'error' in speechResponse ? undefined : speechResponse.media;
            setChatMessages(prev => [...prev, { role: 'assistant', content: response, audioUrl }]);
            setCurrentTaskId(null);
        } else if (task.status === 'failed') {
            setChatMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I encountered an error: ${task.error}` }]);
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: task.error,
            });
            setCurrentTaskId(null);
        }
    };

    const { task, isLoading } = useTask(currentTaskId, onTaskUpdate);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleAskQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!question.trim() || !fileData || !user) return;
        if (isLoading) return;

        const currentQuestion = question;
        setChatMessages(prev => [...prev, { role: 'user', content: currentQuestion }]);
        setQuestion('');

        const taskPayload = { 
            type: 'askQuestion', 
            payload: { 
                fileAsBase64: fileData.fileAsBase64, 
                mimeType: fileData.mimeType, 
                question: currentQuestion 
            } 
        };

        const response = await createTask(user.uid, taskPayload);

        if ('error' in response) {
            setChatMessages(prev => [...prev, { role: 'assistant', content: response.error || 'Sorry, I encountered an error creating the task.' }]);
             toast({
                variant: 'destructive',
                title: 'Error',
                description: response.error,
            });
        } else {
            setCurrentTaskId(response.taskId);
        }
    };

    const isAsking = isLoading || !!currentTaskId;

    return (
        <div className={cn("flex flex-col h-full", className)}>
            <ScrollArea className="flex-grow h-0" ref={chatContainerRef}>
                <div className="space-y-4 p-4">
                    {chatMessages.map((message, index) => (
                        <div key={index} className={cn("flex items-start gap-3", message.role === 'user' ? 'justify-end' : '')}>
                        {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary flex-shrink-0 mt-2" />}
                        <div className={cn("p-3 rounded-lg max-w-[85%]", message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-transparent p-0 w-full')}>
                            {typeof message.content === 'string' ? (
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            ) : (
                                <AssistantMessage message={message.content} audioUrl={message.audioUrl} />
                            )}
                        </div>
                        {message.role === 'user' && <div className="h-8 w-8 flex items-center justify-center rounded-full bg-primary"><User className="h-5 w-5 text-primary-foreground flex-shrink-0" /></div>}
                        </div>
                    ))}
                    {isAsking && (
                        <div className="flex items-start gap-3">
                        <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="p-3 rounded-lg bg-secondary">
                            <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
            <form onSubmit={handleAskQuestion} className="flex items-center gap-2 border-t p-4">
                <Input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Ask a question or pose a scenario..."
                    disabled={isAsking}
                />
                 <Button type="button" variant="ghost" size="icon" disabled={isAsking}>
                    <Mic className="h-4 w-4" />
                </Button>
                <Button type="submit" size="icon" disabled={isAsking || !question.trim()}>
                    <Send className="h-4 w-4" />
                </Button>
            </form>
        </div>
    );
}
