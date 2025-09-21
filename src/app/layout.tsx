import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/hooks/use-auth';
import AppHeader from '@/components/app-header';
import { Inter, Lexend } from 'next/font/google'
import AppFooter from '@/components/app-footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
})


export const metadata: Metadata = {
  title: 'LegalIntel',
  description: 'AI-powered document analysis and legal simulation.',
};

export const maxDuration = 120;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${lexend.variable} dark`}>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <AppHeader />
            <main className="flex-grow">{children}</main>
            <AppFooter />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
