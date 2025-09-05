
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogoIcon } from '@/components/icons';
import { app } from '@/lib/firebase';
import type { PlayablePuzzle } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle, Grid2x2, Gamepad2 } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { cn } from '@/lib/utils';
import { getPublishedPuzzlesAction } from '@/app/actions';
import { format }s from 'date-fns';

export default function PlayHomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [puzzles, setPuzzles] = useState<PlayablePuzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchPuzzles = async () => {
      setIsLoading(true);
      const { data, error } = await getPublishedPuzzlesAction();
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch published puzzles.' });
      } else if (data) {
        setPuzzles(data);
      }
      setIsLoading(false);
    };

    fetchPuzzles();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading puzzles...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
        </div>
        <div className="flex items-center gap-2">
            {user && (
                <Button variant="outline" size="sm" asChild>
                    <Link href="/home">
                        <Grid2x2 className="mr-2 h-4 w-4" />
                        My Puzzles
                    </Link>
                </Button>
            )}
            {user ? (
                <AccountDropdown user={user} />
            ) : (
                 <Button size="sm" asChild>
                    <Link href="/home">
                        Login to Create
                    </Link>
                </Button>
            )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Published Puzzles</h2>
          </div>

          {puzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {puzzles.map(p => (
                <Link key={p.id} href={`/play/${p.id}`} className="group">
                    <Card className="hover:shadow-md hover:border-primary/50 transition-all flex flex-col">
                    <CardHeader className="flex-1">
                        {p.grid && p.size && (
                            <div 
                                className="aspect-square w-full bg-muted/20 rounded-md p-1.5 mb-4"
                            >
                                <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)`}}>
                                    {(p.grid as string[]).flat().join('').split('').map((cell, i) => (
                                        <div key={i} className={cn(
                                            'aspect-square',
                                            cell === '#' ? 'bg-primary' : 'bg-background'
                                        )} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <CardTitle className="truncate">{p.title || 'Untitled Puzzle'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>by @{p.author}</span>
                        {p.createdAt && <span>{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>}
                        </div>
                    </CardContent>
                    </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center border-2 border-dashed rounded-lg p-12">
              <h3 className="text-xl font-medium">No Puzzles Published Yet</h3>
              <p className="mt-2 text-muted-foreground">Check back later for new crossword puzzles to solve.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
