import { Instagram, Linkedin, Heart } from 'lucide-react';
import Link from 'next/link';

export default function AppFooter() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Designed With</span>
          <Heart className="h-4 w-4 text-red-500 fill-red-500" />
          <span>By Team ANIX</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="https://www.linkedin.com/in/parth-tiwari-b38b88342" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
            <Linkedin className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
          </Link>
          <Link href="https://www.instagram.com/_anix.co_" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <Instagram className="h-5 w-5 text-muted-foreground transition-colors hover:text-primary" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
