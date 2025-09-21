
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Scale, History, LogOut, Bot, ShieldCheck, Users, User as UserIcon, LayoutDashboard, Menu, LogIn } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { app } from '@/lib/firebase-config';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';

export default function AppHeader() {
  const { user, signOut, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLawyer, setIsLawyer] = useState(false);
  const [userData, setUserData] = useState<{ displayName?: string, photoURL?: string, email?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      const db = getFirestore(app);
      const userDocRef = doc(db, 'users', user.uid);

      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const uData = doc.data();
          setUserData(uData);
          setIsAdmin(uData.role === 'admin');
          setIsLawyer(uData.role === 'lawyer');
        } else {
          // Fallback if firestore doc hasn't been created yet
          setIsAdmin(false);
          setIsLawyer(false);
          setUserData({ email: user.email, displayName: user.displayName, photoURL: user.photoURL });
        }
      });

      return () => unsubscribe();
    } else {
      setIsAdmin(false);
      setIsLawyer(false);
      setUserData(null);
    }
  }, [user]);

  const navLinks = (
    <>
      <Link href="/">Analyzer</Link>
      <Link href="/history">History</Link>
      <Link href="/legal-simulator">Simulator</Link>
      {isLawyer && user && <Link href={`/dashboard/${user.uid}`}>Dashboard</Link>}
      {isAdmin && <Link href="/admin">Lawyers</Link>}
      {isAdmin && <Link href="/users">Users</Link>}
    </>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Scale className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">LegalIntel</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {user && navLinks}
          </nav>
        </div>
        
        {/* Mobile Menu */}
        <div className="md:hidden">
         <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <div className="p-4">
                 <Link href="/" className="mr-6 flex items-center space-x-2 mb-6" onClick={() => setMobileMenuOpen(false)}>
                    <Scale className="h-6 w-6" />
                    <span className="font-bold">LegalIntel</span>
                  </Link>
                <nav className="flex flex-col gap-4 text-lg">
                  {user ? (
                    React.Children.map(navLinks.props.children, child => 
                      child ? React.cloneElement(child, { onClick: () => setMobileMenuOpen(false) }) : null
                    )
                  ) : null}
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center gap-2">
            {loading ? null : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={userData?.photoURL || undefined} alt={userData?.displayName || 'User'} />
                      <AvatarFallback>{userData?.displayName?.[0] || userData?.email?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{userData?.displayName || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {userData?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <Link href="/profile">
                        <DropdownMenuItem>
                            <UserIcon className="mr-2 h-4 w-4" />
                            <span>My Profile</span>
                        </DropdownMenuItem>
                    </Link>
                    {isLawyer && (
                         <Link href={`/dashboard/${user.uid}`}>
                            <DropdownMenuItem>
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                <span>Dashboard</span>
                            </DropdownMenuItem>
                        </Link>
                    )}
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogIn className="mr-2" /> Login
                </Link>
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
