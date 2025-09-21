

'use client';

import { Loader2, ShieldCheck, Trash2, UserPlus, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, query, where, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addLawyer, deleteLawyer } from '../actions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { getAuth, deleteUser } from 'firebase/auth';


type Lawyer = {
    id: string; 
    uid: string;
    name: string;
    specialty?: string;
    location?: string;
    contact?: string;
    costPerHearing?: number;
    lawyerDocId: string; 
};

const lawyerFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  email: z.string().email("Invalid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  specialty: z.string().min(1, "Specialty is required."),
  location: z.string().min(1, "Location is required."),
  contact: z.string().min(1, "Contact info is required."),
  costPerHearing: z.coerce.number().min(0, "Cost must be a positive number."),
});

export default function AdminPage() {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof lawyerFormSchema>>({
    resolver: zodResolver(lawyerFormSchema),
    defaultValues: { name: '', email: '', password: '', specialty: '', location: '', contact: '', costPerHearing: 0 },
  });

  useEffect(() => {
    const db = getFirestore(app);
    const q = query(collection(db, "users"), where("role", "==", "lawyer"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
        setLoading(true);
        const lawyerUsers = snapshot.docs.map(doc => ({
            id: doc.id,
            uid: doc.id,
            name: doc.data().displayName,
            ...doc.data()
        }));

        const lawyersCollectionRef = collection(db, 'lawyers');
        const enrichedLawyers = await Promise.all(
            lawyerUsers.map(async (user) => {
                const lawyerQuery = query(lawyersCollectionRef, where('uid', '==', user.uid));
                const lawyerSnapshot = await getDocs(lawyerQuery);
                if (!lawyerSnapshot.empty) {
                    const lawyerDoc = lawyerSnapshot.docs[0];
                    return {
                        ...user,
                        ...lawyerDoc.data(),
                        id: lawyerDoc.id, // Use lawyer doc id as primary id
                        lawyerDocId: lawyerDoc.id,
                    };
                }
                // This user has role 'lawyer' but no profile in 'lawyers' collection yet.
                return {
                    ...user,
                    id: user.uid, // Fallback to UID
                    lawyerDocId: user.uid, // Use UID as the target for deletion logic
                };
            })
        );
        
        setLawyers(enrichedLawyers as Lawyer[]);
        setLoading(false);
    }, (err) => {
        console.error("Error fetching lawyers:", err);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch lawyers.' });
        setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const onSubmit = async (values: z.infer<typeof lawyerFormSchema>) => {
    setIsSubmitting(true);
    const result = await addLawyer(values);
    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Success', description: 'Lawyer added successfully.' });
      form.reset();
    }
    setIsSubmitting(false);
  };
  
  const handleDelete = async (lawyer: Lawyer) => {
    const result = await deleteLawyer(lawyer.id);
    if (result.error) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Success', description: 'Lawyer deleted.' });
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8 md:mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
              <ShieldCheck className="h-8 w-8 text-primary" />
              Lawyer Management
          </h1>
          <p className="text-muted-foreground mt-2">Manage lawyer profiles for recommendations.</p>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus/> Add New Lawyer</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="lawyer@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="specialty" render={({ field }) => (
                                <FormItem><FormLabel>Specialty</FormLabel><FormControl><Input placeholder="e.g., Contract Law" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="location" render={({ field }) => (
                                <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="City, State" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="contact" render={({ field }) => (
                                <FormItem><FormLabel>Contact Info</FormLabel><FormControl><Input placeholder="email or phone" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="costPerHearing" render={({ field }) => (
                                <FormItem><FormLabel>Cost Per Hearing (₹)</FormLabel><FormControl><Input type="number" placeholder="300" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Add Lawyer
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        
        <div className="xl:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Current Lawyers</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                   <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Specialty</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Cost/Hearing</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lawyers.length > 0 ? lawyers.map(lawyer => (
                                <TableRow key={lawyer.id}>
                                    <TableCell className="font-medium">{lawyer.name}</TableCell>
                                    <TableCell className="text-primary">{lawyer.specialty || 'N/A'}</TableCell>
                                    <TableCell>{lawyer.location || 'N/A'}</TableCell>
                                    <TableCell>{lawyer.costPerHearing ? `₹${lawyer.costPerHearing.toLocaleString()}` : 'N/A'}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" asChild>
                                            <Link href={`/dashboard/${lawyer.uid}`} title="View Dashboard" target="_blank">
                                                <ExternalLink className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>This will permanently delete the lawyer profile and associated user account for {lawyer.name}.</AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(lawyer)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No lawyers found. Add one to get started or assign the 'lawyer' role to a user.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </main>
  );
}
