'use client';

import { useEffect, useState } from 'react';
import { getFirestore, collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { Loader2, Users as UsersIcon, Shield, Briefcase, User as UserIcon, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createNewUser } from '../actions';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type UserProfile = {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'user' | 'lawyer';
  createdAt: { toDate: () => Date };
};

const userFormSchema = z.object({
    displayName: z.string().min(1, "Display name is required."),
    email: z.string().email("Invalid email address."),
    password: z.string().min(6, "Password must be at least 6 characters."),
    role: z.enum(['user', 'lawyer', 'admin']),
});

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { displayName: '', email: '', password: '', role: 'user' },
  });

  useEffect(() => {
    const db = getFirestore(app);
    const usersRef = collection(db, 'users');
    const unsubscribe = onSnapshot(usersRef, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      setUsers(usersData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching users:", err);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch users.' });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [toast]);

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user' | 'lawyer') => {
    const db = getFirestore(app);
    const userRef = doc(db, 'users', userId);
    try {
      await updateDoc(userRef, { role: newRole });
      toast({ title: 'Success', description: 'User role updated.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: `Failed to update role: ${error.message}` });
    }
  };
  
  const onUserSubmit = async (values: z.infer<typeof userFormSchema>) => {
    setIsSubmitting(true);
    const result = await createNewUser(values);
    if ('error' in result) {
      toast({ variant: 'destructive', title: 'Error Creating User', description: result.error });
    } else {
      toast({ title: 'Success', description: 'User created successfully.' });
      form.reset();
    }
    setIsSubmitting(false);
  };

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
          <UsersIcon className="h-8 w-8 text-primary" />
          User Management
        </h1>
        <p className="text-muted-foreground mt-2">View and manage user roles.</p>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-1">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><UserPlus/> Add New User</CardTitle>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onUserSubmit)} className="space-y-4">
                            <FormField control={form.control} name="displayName" render={({ field }) => (
                                <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="user@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem><FormLabel>Password</FormLabel><FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="role" render={({ field }) => (
                               <FormItem>
                                <FormLabel>Role</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="lawyer">Lawyer</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}/>
                            <Button type="submit" className="w-full" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Create User
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
        <div className="xl:col-span-2">
             <Card>
                <CardHeader>
                    <CardTitle>Current Users</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[150px]">Role</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {users.length > 0 ? users.map((user) => (
                        <TableRow key={user.id}>
                        <TableCell className="font-medium">
                            <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                    <AvatarFallback>{user.email?.[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <span>{user.displayName || 'N/A'}</span>
                            </div>
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.createdAt ? user.createdAt.toDate().toLocaleDateString() : 'N/A'}</TableCell>
                        <TableCell>
                            <Select defaultValue={user.role} onValueChange={(value: 'admin' | 'user' | 'lawyer') => handleRoleChange(user.id, value)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">
                                        <span className="flex items-center gap-2"><UserIcon className="h-4 w-4"/> User</span>
                                    </SelectItem>
                                    <SelectItem value="lawyer">
                                        <span className="flex items-center gap-2"><Briefcase className="h-4 w-4"/> Lawyer</span>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                        <span className="flex items-center gap-2"><Shield className="h-4 w-4"/> Admin</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </TableCell>
                        </TableRow>
                    )) : (
                        <TableRow>
                            <TableCell colSpan={4} className="h-24 text-center">
                                No users found.
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
