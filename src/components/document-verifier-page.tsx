
'use client';

import { AlertTriangle, Briefcase, FileJson, FileSearch2, Flame, GanttChart, Handshake, Info, Landmark, Layers, Loader2, Microscope, Pilcrow, Scale, Shield, Sparkles, Upload, UserRoundCheck, Wallet, GitCompare } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { createTask } from '@/app/actions';
import type { ClassifyDocumentOutput } from '@/ai/flows/classify-uploaded-document';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import ChatInterface from './chat-interface';
import { useTask } from '@/hooks/use-task';
import { Progress } from './ui/progress';

const ACCEPTED_FILE_TYPES = {
  'text/plain': '.txt',
  'application/pdf': '.pdf',
};

type Lawyer = {
    id: string;
    name: string;
    specialty: string;
    location: string;
    contact: string;
    costPerHearing: number;
}
type AnalysisResult = ClassifyDocumentOutput & { 
    fileAsBase64?: string; 
    mimeType?: string; 
    fileName?: string; 
    recommendedLawyers?: Lawyer[];
    expenditureAnalysis: {
        estimatedCostRange: string;
    } & ClassifyDocumentOutput['expenditureAnalysis'];
};

export default function DocumentVerifierPage() {
  const { user } = useAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ fileName: string, fileAsBase64: string, mimeType: string } | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  const { toast } = useToast();
  
  const onTaskUpdate = (task: any) => {
    if (task.status === 'completed') {
      const taskResult = task.result as AnalysisResult;
      setResult({ ...taskResult, ...uploadedFile });
      setCurrentTaskId(null);
    } else if (task.status === 'failed') {
      toast({
        variant: 'destructive',
        title: 'Analysis Failed',
        description: task.error,
      });
      setUploadedFile(null);
      setCurrentTaskId(null);
    }
  };
  
  const { task, isLoading } = useTask(currentTaskId, onTaskUpdate);
  
  const processFile = (file: File) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in to analyze documents.' });
        return;
    }
    if (Object.keys(ACCEPTED_FILE_TYPES).includes(file.type)) {
      setResult(null);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const fileAsBuffer = e.target?.result as ArrayBuffer;
        if (fileAsBuffer) {
          const fileAsBase64 = Buffer.from(fileAsBuffer).toString('base64');
          const fileInfo = { fileName: file.name, fileAsBase64, mimeType: file.type };
          setUploadedFile(fileInfo);
          
          const taskPayload = { type: 'classifyDocument', payload: fileInfo };
          const response = await createTask(user.uid, taskPayload);

          if ('error' in response) {
             toast({ variant: 'destructive', title: 'Error', description: response.error });
             setUploadedFile(null);
          } else {
             setCurrentTaskId(response.taskId);
          }
        }
      };
      reader.onerror = () => {
        toast({ variant: 'destructive', title: 'Error reading file.' });
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        variant: 'destructive',
        title: 'Unsupported File Type',
        description: `Please upload one of the following file types: ${Object.values(ACCEPTED_FILE_TYPES).join(', ')}`,
      });
    }
  };
  
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragEvents = (event: React.DragEvent<HTMLDivElement>, dragging: boolean) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(dragging);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(event, false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };
  
  const riskBadge = (riskLevel: 'Low' | 'Medium' | 'High') => {
    const variants = {
      Low: 'default',
      Medium: 'secondary',
      High: 'destructive',
    };
    const variantKey = riskLevel as keyof typeof variants;
    return <Badge variant={variants[variantKey] as 'default' | 'secondary' | 'destructive'}>{riskLevel}</Badge>;
  };
  
  const AccordionIconTrigger = ({ icon, children }: { icon: React.ReactNode, children: React.ReactNode }) => (
    <AccordionTrigger className="text-lg font-semibold font-display">
      <div className="flex items-center gap-3">
        {icon}
        <span>{children}</span>
      </div>
    </AccordionTrigger>
  );

  const isProcessing = isLoading;

  return (
    <div className="container mx-auto px-4 py-8 sm:py-12">
      <header className="text-center mb-8 md:mb-12">
        <div className="inline-flex items-center gap-3">
            <Scale className="h-10 w-10 text-primary" />
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-display">LegalIntel</h1>
        </div>
        <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
            Leverage AI to demystify your legal documents. Upload a file to get a summary, risk analysis, and simulate scenarios.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="font-display">Submit Document</CardTitle>
                <CardDescription>Upload a .txt or .pdf file for analysis.</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  onDragEnter={(e) => handleDragEvents(e, true)}
                  onDragLeave={(e) => handleDragEvents(e, false)}
                  onDragOver={(e) => handleDragEvents(e, true)}
                  onDrop={handleDrop}
                  className={cn(
                    "relative flex flex-col items-center justify-center w-full p-8 rounded-lg border-2 border-dashed transition-colors",
                    isDragging ? "border-primary bg-accent" : "border-input",
                    isProcessing && "cursor-not-allowed opacity-50"
                  )}
                >
                  <div className="text-center">
                    <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      <label htmlFor="file-upload" className={cn("font-semibold text-primary hover:underline", isProcessing ? "cursor-not-allowed" : "cursor-pointer")}>
                        Upload a file
                      </label>
                      {' '}or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">{Object.values(ACCEPTED_FILE_TYPES).join(', ')}</p>
                    <input id="file-upload" type="file" className="sr-only" accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')} onChange={handleFileSelect} disabled={isProcessing} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {result && uploadedFile && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-display">AI Legal Simulator</CardTitle>
                  <CardDescription>Ask LexiAI questions like "What happens if I miss a payment?"</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ChatInterface 
                    fileData={{
                        fileAsBase64: uploadedFile.fileAsBase64,
                        mimeType: uploadedFile.mimeType,
                        fileName: uploadedFile.fileName
                    }}
                    className="h-[600px]" 
                    initialMessages={[{role: 'assistant', content: `Hello! I'm LexiAI. I have your document "${uploadedFile.fileName}" ready. What would you like to know? You can ask me to explain a clause, simulate a scenario, or clarify legal terms.`}]}
                  />
                </CardContent>
              </Card>
            )}
        </div>
        
        <Card className="min-h-full sticky top-20">
          <CardHeader>
            <CardTitle className="font-display">Analysis Result</CardTitle>
            {uploadedFile && <CardDescription>Showing results for {uploadedFile.fileName}</CardDescription>}
            {!uploadedFile && <CardDescription>AI-powered analysis by LexiAI.</CardDescription>}
          </CardHeader>
          <CardContent>
            {isProcessing ? (
              <div className="space-y-4 pt-4 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing your document... This may take a moment.</p>
                <p className="text-xs text-muted-foreground/80">Please keep this window open. You can continue to other parts of the site.</p>
              </div>
            ) : result ? (
              <div className="space-y-6">
                <Accordion type="multiple" className="w-full" defaultValue={["summary", "action-prioritizer", "risk-radar", "expenditure-analysis", "lawyer-recommendations"]}>
                  <AccordionItem value="summary">
                     <AccordionIconTrigger icon={<FileJson className="h-5 w-5" />}>Executive Summary</AccordionIconTrigger>
                    <AccordionContent className="text-sm bg-secondary/50 p-4 rounded-md space-y-4">
                      <p>{result.executiveSummary.overview}</p>
                      <div className="p-3 rounded-md border bg-card">
                        <h4 className="font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> Balance of Power</h4>
                        <p className="mt-1 text-sm">{result.executiveSummary.balanceOfPower}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="action-prioritizer">
                    <AccordionIconTrigger icon={<GanttChart className="h-5 w-5" />}>Action Prioritizer</AccordionIconTrigger>
                    <AccordionContent className="space-y-3 p-1">
                      <div>
                        <h4 className="font-semibold text-destructive flex items-center gap-2 mb-2"><Flame className="h-4 w-4"/>Critical</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                            {result.actionPrioritizer.critical.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-amber-500 flex items-center gap-2 mb-2"><Info className="h-4 w-4"/>Important</h4>
                         <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                            {result.actionPrioritizer.important.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sky-500 flex items-center gap-2 mb-2"><Sparkles className="h-4 w-4"/>Optional</h4>
                         <ul className="list-disc list-inside space-y-1 text-sm pl-2">
                            {result.actionPrioritizer.optional.map((item, index) => <li key={index}>{item}</li>)}
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="risk-radar">
                    <AccordionIconTrigger icon={<AlertTriangle className="h-5 w-5" />}>Risk Radar (Top Red Flags)</AccordionIconTrigger>
                    <AccordionContent className="space-y-4 p-1">
                      {result.riskRadar.length > 0 ? result.riskRadar.map((item, index) => (
                        <div key={index} className="p-4 rounded-md border border-destructive/50 bg-destructive/10">
                          <h4 className="font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Clause: {item.clause}</h4>
                          <p className="mt-2 text-sm">{item.risk}</p>
                          <p className="mt-2 text-sm font-semibold">Suggestion: <span className="font-normal">{item.suggestion}</span></p>
                        </div>
                      )) : <p className="p-4 text-sm text-muted-foreground">No high-risk items were detected.</p>}
                    </AccordionContent>
                  </AccordionItem>
                  {result.expenditureAnalysis && (
                    <AccordionItem value="expenditure-analysis">
                      <AccordionIconTrigger icon={<Wallet className="h-5 w-5" />}>Expenditure Analysis</AccordionIconTrigger>
                      <AccordionContent className="text-sm bg-secondary/50 p-4 rounded-md space-y-4">
                          <div className="text-center">
                            <p className="text-muted-foreground">{result.expenditureAnalysis.proceedingType} (est. {result.expenditureAnalysis.estimatedHearings} hearings)</p>
                            <p className="text-2xl font-bold">{result.expenditureAnalysis.estimatedCostRange}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Primary Cost Factors</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                {result.expenditureAnalysis.costFactors.map((item, i) => <li key={i}>{item}</li>)}
                            </ul>
                          </div>
                          <p className="text-xs text-muted-foreground text-center pt-2 border-t">{result.expenditureAnalysis.disclaimer}</p>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  {result.recommendedLawyers && (
                    <AccordionItem value="lawyer-recommendations">
                      <AccordionIconTrigger icon={<Briefcase className="h-5 w-5" />}>Lawyer Recommendations</AccordionIconTrigger>
                      <AccordionContent className="space-y-3 p-1">
                        {result.recommendedLawyers.length > 0 ? result.recommendedLawyers.map((lawyer) => (
                           <div key={lawyer.id} className="p-3 rounded-md border bg-card">
                             <h4 className="font-semibold text-base">{lawyer.name}</h4>
                             <p className="text-sm text-primary font-medium">{lawyer.specialty}</p>
                             <p className="mt-1 text-sm text-muted-foreground">{lawyer.location}</p>
                             <p className="mt-1 text-sm text-muted-foreground">Contact: {lawyer.contact}</p>
                             <p className="mt-1 text-sm text-muted-foreground">Est. Cost per Hearing: ₹{lawyer.costPerHearing?.toLocaleString()}</p>
                           </div>
                        )) : <p className="p-4 text-sm text-muted-foreground">No lawyers found matching the category '{result.lawyerCategory}'. You can add lawyers in the admin dashboard.</p>}
                      </AccordionContent>
                    </AccordionItem>
                  )}
                  <AccordionItem value="hidden-traps">
                    <AccordionIconTrigger icon={<Microscope className="h-5 w-5" />}>Hidden Traps</AccordionIconTrigger>
                     <AccordionContent className="space-y-3 p-1">
                        {result.hiddenTraps.map((item, index) => (
                           <div key={index} className="p-3 rounded-md border bg-card">
                             <h4 className="font-semibold text-base">Clause: {item.clause}</h4>
                             <p className="mt-1 text-sm text-muted-foreground">{item.trap}</p>
                           </div>
                        ))}
                     </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="clause-by-clause">
                    <AccordionIconTrigger icon={<Pilcrow className="h-5 w-5" />}>Clause-by-Clause Simplification</AccordionIconTrigger>
                    <AccordionContent className="space-y-4 p-1">
                       {result.clauseByClause.map((item, index) => (
                        <div key={index} className="p-4 rounded-md border bg-card">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="font-semibold text-base">Clause: {item.clause}</h4>
                            {riskBadge(item.riskLevel)}
                          </div>
                           <div className="mt-2">
                                <p className="text-xs text-muted-foreground">Clarity Score</p>
                                <div className="flex items-center gap-2">
                                    <Progress value={item.clarityScore * 10} className="h-2 w-24" />
                                    <span className="text-sm font-semibold">{item.clarityScore}/10</span>
                                </div>
                            </div>
                          <p className="mt-3 text-sm text-muted-foreground">{item.simplification}</p>
                          {item.riskReason && <p className="mt-2 text-sm text-amber-500"><b>Risk:</b> {item.riskReason}</p>}
                          <div className="mt-3">
                            <h5 className="font-semibold text-sm mb-1">Suggested Actions:</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                              {item.suggestions.map((action, i) => <li key={i}>{action}</li>)}
                            </ul>
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="jargon-buster">
                    <AccordionIconTrigger icon={<Layers className="h-5 w-5" />}>Jargon Buster</AccordionIconTrigger>
                    <AccordionContent className="space-y-3 p-1">
                      {result.jargonBuster.map((item, index) => (
                        <div key={index} className="p-3 rounded-md border bg-card">
                          <h4 className="font-semibold text-base">{item.term}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{item.explanation}</p>
                          <p className="mt-1 text-xs text-muted-foreground/70">Found in: {item.clause}</p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="negotiation-playbook">
                    <AccordionIconTrigger icon={<Handshake className="h-5 w-5" />}>Negotiation Playbook</AccordionIconTrigger>
                    <AccordionContent className="space-y-3 p-1">
                      {result.negotiationPlaybook.map((item, index) => (
                        <div key={index} className="p-3 rounded-md border bg-card">
                          <h4 className="font-semibold text-base">Regarding Clause: {item.clause}</h4>
                          <p className="mt-1 text-sm text-muted-foreground">{item.strategy}</p>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="cost-benefit">
                     <AccordionIconTrigger icon={<Wallet className="h-5 w-5" />}>Cost & Benefit Snapshot</AccordionIconTrigger>
                     <AccordionContent className="text-sm bg-secondary/50 p-4 rounded-md space-y-4">
                        <div className="text-center font-bold text-lg">{result.costBenefitSnapshot.summary}</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h4 className="font-semibold text-destructive mb-2">Potential Costs</h4>
                                <ul className="list-disc list-inside space-y-1 text-sm">
                                  {result.costBenefitSnapshot.costs.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-green-500 mb-2">Benefits & Rights</h4>
                                 <ul className="list-disc list-inside space-y-1 text-sm">
                                  {result.costBenefitSnapshot.benefits.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </div>
                        </div>
                     </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="fairness-jurisdiction">
                    <AccordionIconTrigger icon={<Landmark className="h-5 w-5" />}>Fairness & Jurisdiction</AccordionIconTrigger>
                     <AccordionContent className="text-sm bg-secondary/50 p-4 rounded-md space-y-4">
                        <div>
                            <h4 className="font-semibold mb-1">Overall Fairness Score</h4>
                             <div className="flex items-center gap-2">
                                <Progress value={result.fairnessScoreJurisdiction.fairnessScore * 10} className="h-2 w-32" />
                                <span className="text-base font-bold">{result.fairnessScoreJurisdiction.fairnessScore}/10</span>
                            </div>
                            <p className="text-xs mt-1">{result.fairnessScoreJurisdiction.fairnessReasoning}</p>
                        </div>
                        <div className="p-3 rounded-md border bg-card">
                            <h4 className="font-semibold">Governing Law & Jurisdiction</h4>
                            <p className="mt-1 text-sm">{result.fairnessScoreJurisdiction.jurisdiction}</p>
                            <p className="mt-2 text-xs font-semibold">Potential Impact: <span className="font-normal">{result.fairnessScoreJurisdiction.jurisdictionImpact}</span></p>
                        </div>
                     </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="privacy">
                     <AccordionIconTrigger icon={<GitCompare className="h-5 w-5" />}>Privacy & Data Use</AccordionIconTrigger>
                      <AccordionContent className="space-y-3 p-1">
                        {result.privacyDataUse.map((item, index) => (
                           <div key={index} className="p-3 rounded-md border bg-card">
                            <h4 className="font-semibold text-base">Clause: {item.clause}</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                                <li><b>Data Shared:</b> {item.dataShared}</li>
                                <li><b>Shared With:</b> {item.sharedWith}</li>
                                <li><b>Duration:</b> {item.duration}</li>
                            </ul>
                           </div>
                        ))}
                      </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="checklist">
                    <AccordionIconTrigger icon={<UserRoundCheck className="h-5 w-5" />}>Consumer Checklist</AccordionIconTrigger>
                    <AccordionContent className="p-4 bg-secondary/50 rounded-md">
                       <ul className="list-disc list-inside space-y-2 text-sm">
                          {result.consumerChecklist.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                 <div className="mt-6 text-xs text-muted-foreground text-center p-4 border-t">
                  <p className="font-bold flex items-center justify-center gap-2"><Shield className="h-4 w-4" /> This is not legal advice. For important matters, consult a qualified lawyer.</p>
                </div>
              </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-[400px] text-center text-muted-foreground">
                    <FileSearch2 className="h-16 w-16" />
                    <h3 className="mt-4 text-lg font-semibold font-display">Awaiting Document</h3>
                    <p className="mt-1 text-sm">
                        Your analysis results will appear here.
                    </p>
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
