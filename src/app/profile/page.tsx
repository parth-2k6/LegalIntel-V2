
'use client';

import { useAuth } from '@/hooks/use-auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { useEffect, useState } from 'react';
import { Loader2, FileWarning, User as UserIcon, Briefcase } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '../actions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type UserProfile = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  about?: string;
  role: 'admin' | 'user' | 'lawyer';
  createdAt: { toDate: () => Date };
};

const profileFormSchema = z.object({
  displayName: z.string().min(1, "Display name is required."),
  about: z.string().max(500, "About section must be 500 characters or less.").optional(),
  photo: z.any().optional(), // For file input
});

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: { displayName: '', about: '' },
  });

  useEffect(() => {
    if (user) {
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', user.uid);
      
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = { id: doc.id, ...doc.data() } as UserProfile;
          setProfile(data);
          form.reset({
            displayName: data.displayName || '',
            about: data.about || '',
          });
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, form]);
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof profileFormSchema>) => {
    if (!user) return;
    setIsSubmitting(true);

    let photoBase64: string | undefined = undefined;
    let photoMimeType: string | undefined = undefined;

    if (previewImage && previewImage.startsWith('data:')) {
        const parts = previewImage.split(',');
        photoMimeType = parts[0].split(':')[1].split(';')[0];
        photoBase64 = parts[1];
    }
    
    const result = await updateUserProfile(user.uid, {
        displayName: values.displayName,
        about: values.about,
        photoBase64,
        photoMimeType
    });

    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error', description: result.error });
    } else {
      toast({ title: 'Success', description: 'Your profile has been updated.' });
       if (previewImage) {
        setPreviewImage(null); // Clear preview after successful upload
       }
    }
    setIsSubmitting(false);
  };


  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <main className="container mx-auto px-4 py-8 sm:py-12">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <FileWarning /> Access Denied
            </CardTitle>
            <CardDescription>
              You must be logged in to view this page.
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
    <main className="container max-w-2xl mx-auto px-4 py-8 sm:py-12">
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight flex items-center gap-3">
          <UserIcon className="h-8 w-8 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-2">Update your personal information.</p>
      </header>
      
      {profile.role === 'lawyer' && (
        <Card className="mb-8">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase/> Lawyer Dashboard</CardTitle>
                <CardDescription>Manage your cases and view your public profile.</CardDescription>
            </CardHeader>
            <CardContent>
                <Button asChild>
                    <Link href={`/dashboard/${user.uid}`}>Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="photo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profile Picture</FormLabel>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={previewImage || profile?.photoURL || undefined} alt={profile?.displayName} />
                            <AvatarFallback>{profile?.displayName?.[0] || 'U'}</AvatarFallback>
                        </Avatar>
                        <FormControl>
                            <Input 
                                type="file" 
                                accept="image/png, image/jpeg, image/gif"
                                onChange={(e) => {
                                    field.onChange(e.target.files);
                                    handleFileChange(e);
                                }}
                            />
                        </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="displayName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="about"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>About</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell us a little bit about yourself"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      You can write a brief bio here.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Profile
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </main>
  );
}
