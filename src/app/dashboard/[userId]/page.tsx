
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getFirestore, doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { useEffect, useState, use } from 'react';
import { Loader2, FileWarning, Briefcase, User as UserIcon, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import CaseLogs from '@/components/case-logs';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateLawyerProfile } from '@/app/actions';

type LawyerProfile = {
  id: string;
  name: string;
  specialty: string;
  location: string;
  contact: string;
  uid: string;
  costPerHearing: number;
};

type UserProfile = {
  displayName?: string;
  photoURL?: string;
  about?: string;
  role: string;
};

const lawyerProfileSchema = z.object({
    specialty: z.string().min(1, "Specialty is required."),
    location: z.string().min(1, "Location is required."),
    contact: z.string().min(1, "Contact info is required."),
    costPerHearing: z.coerce.number().min(0, "Cost must be a positive number."),
});


export default function LawyerDashboardPage({ params }: { params: { userId: string } }) {
  const { userId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const [lawyerProfile, setLawyerProfile] = useState<LawyerProfile | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const viewOnly = user?.uid !== userId;

  const form = useForm<z.infer<typeof lawyerProfileSchema>>({
    resolver: zodResolver(lawyerProfileSchema),
    defaultValues: { specialty: '', location: '', contact: '', costPerHearing: 0 },
  });


  useEffect(() => {
    if (!userId) {
      setError("No user ID provided.");
      setLoading(false);
      return;
    }

    const db = getFirestore(app);

    // Fetch user profile (for about, photo etc)
    const userDocRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data() as UserProfile;
        if (data.role !== 'lawyer') {
          setError("This user is not a lawyer.");
          setLawyerProfile(null);
        }
        setUserProfile(data);
      } else {
        setError("User profile not found.");
      }
    }, (e) => {
        console.error("Error fetching user profile:", e);
        setError("Could not load user profile.");
    });
    
    // Fetch lawyer-specific professional profile
    const q = query(collection(db, 'lawyers'), where('uid', '==', userId));
    const unsubscribeLawyer = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
            const lawyerDoc = snapshot.docs[0];
            const data = { id: lawyerDoc.id, ...lawyerDoc.data() } as LawyerProfile;
            setLawyerProfile(data);
            form.reset({
                specialty: data.specialty,
                location: data.location,
                contact: data.contact,
                costPerHearing: data.costPerHearing,
            });
        }
        setLoading(false);
    }, (e) => {
        console.error("Error fetching lawyer profile:", e);
        setError("Could not load lawyer profile.");
        setLoading(false);
    });

    return () => {
        unsubscribeUser();
        unsubscribeLawyer();
    };

  }, [userId, form]);

  const onSubmit = async (values: z.infer<typeof lawyerProfileSchema>) => {
    if (!user || viewOnly) return;
    setIsSubmitting(true);
    const result = await updateLawyerProfile(user.uid, {
        name: userProfile?.displayName || user.displayName || 'Unknown',
        ...values
    });

    if ('error' in result) {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
        toast({ title: 'Success', description: 'Your professional profile has been updated.' });
    }
    setIsSubmitting(false);
  }

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error || !userProfile || userProfile.role !== 'lawyer') {
    return (
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <FileWarning /> Error
            </CardTitle>
            <CardDescription>
              {error || "Could not load lawyer dashboard."}
            </CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }
  
  const LawyerInfoCard = () => (
     <Card>
        <CardHeader className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={userProfile.photoURL} />
            <AvatarFallback>
                <UserIcon className="h-12 w-12" />
            </AvatarFallback>
            </Avatar>
            <CardTitle>{userProfile.displayName}</CardTitle>
            {lawyerProfile && <CardDescription className="text-primary">{lawyerProfile.specialty}</CardDescription>}
        </CardHeader>
        <CardContent className="text-sm text-center space-y-4">
            {userProfile.about && <p className="text-muted-foreground">{userProfile.about}</p>}
            {lawyerProfile && (
            <div className="text-left border-t pt-4">
                <p><strong>Location:</strong> {lawyerProfile.location}</p>
                <p><strong>Contact:</strong> {lawyerProfile.contact}</p>
                <p><strong>Cost Per Hearing:</strong> ₹{lawyerProfile.costPerHearing?.toLocaleString()}</p>
            </div>
            )}
        </CardContent>
    </Card>
  )

  const EditProfileForm = () => (
      <Card>
        <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>Please provide your professional details to be recommended to users.</CardDescription>
        </CardHeader>
        <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Save className="mr-2" />
                        Save Profile
                    </Button>
                </form>
            </Form>
        </CardContent>
      </Card>
  )

  return (
    <main className="container mx-auto px-4 py-8 sm:py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <LawyerInfoCard />
          {!viewOnly && <EditProfileForm />}
        </div>
        <div className="md:col-span-2">
           <CaseLogs lawyerId={userId} viewOnly={viewOnly} />
        </div>
      </div>
    </main>
  );
}
