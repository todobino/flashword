
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { app } from '@/lib/firebase';
import { LoaderCircle, UserCircle, Settings } from 'lucide-react';
import { AppHeader } from '@/components/app-header';


export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading account details...</p>
      </div>
    );
  }

  const navItems = [
    { href: '/account/profile', label: 'Profile', icon: UserCircle },
    { href: '/account/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader variant="default" />

      <div className="flex-1 md:grid md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block border-r bg-muted/20 p-4 sticky top-16 h-[calc(100vh-4rem)]">
            <nav className="flex flex-col gap-2">
                 {navItems.map(item => (
                    <Link key={item.href} href={item.href}>
                         <Button
                            variant={pathname === item.href ? 'default' : 'ghost'}
                            className="w-full justify-start"
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                    </Link>
                ))}
            </nav>
        </aside>
        <main className="p-4 sm:p-6 md:p-8">
            {children}
        </main>
      </div>
    </div>
  );
}
