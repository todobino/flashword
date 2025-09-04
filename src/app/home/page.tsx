
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, DocumentData, doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoIcon } from '@/components/icons';
import { app, db } from '@/lib/firebase';
import type { Puzzle, PuzzleDoc } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCrosswordStore } from '@/store/crossword-store';
import { Grid2x2Plus, LoaderCircle, LogOut, User, CheckCircle, Edit, Grid2x2 } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { createGrid } from '@/hooks/use-crossword';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import { cn } from '@/lib/utils';

// A type for the puzzles listed on the home page, which might have less data
type PuzzleListing = Pick<PuzzleDoc, 'title' | 'size' | 'status' | 'grid'> & { id: string };

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const setPuzzle = useCrosswordStore(state => state.setPuzzle);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchPuzzles(user.uid);
      } else {
        router.push('/');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPuzzles = async (uid: string) => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'users', uid, 'puzzles'),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const userPuzzles = querySnapshot.docs.map(doc => {
          const data = doc.data() as PuzzleDoc;
          return {
            id: doc.id,
            title: data.title,
            size: data.size,
            status: data.status || 'draft',
            grid: data.grid,
          }
      }) as PuzzleListing[];
      setPuzzles(userPuzzles);
    } catch (error) {
      console.error('Error fetching puzzles:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not fetch your puzzles.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePuzzleSelect = async (puzzleId: string) => {
     if (!user) return;
     router.push(`/edit/${puzzleId}`);
  };

  const handleStartBuilder = (puzzle: Puzzle) => {
    setPuzzle(puzzle);
    router.push(`/edit/${puzzle.id}`);
  };

  const handleLoad = (puzzle: Puzzle) => {
      setPuzzle(puzzle);
      router.push(`/edit/${puzzle.id}`);
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
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
            <Button variant="outline" size="sm" asChild>
                <Link href="/home">
                    <Grid2x2 className="mr-2 h-4 w-4" />
                    My Puzzles
                </Link>
            </Button>
            <AccountDropdown user={user} />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Puzzles</h2>
            <Button asChild>
                <Link href="/new">
                    <Grid2x2Plus className="h-4 w-4 mr-2" /> Create New
                </Link>
            </Button>
          </div>

          {puzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {puzzles.map(p => (
                <Card 
                  key={p.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer flex flex-col"
                  onClick={() => handlePuzzleSelect(p.id)}
                >
                  <CardHeader className="flex-1">
                     {p.grid && (
                        <div 
                            className="aspect-square w-full bg-muted/20 rounded-md p-1.5 mb-4"
                        >
                            <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)`}}>
                                {p.grid.flat().join('').split('').map((cell, i) => (
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
                      <span>{p.size} x {p.size}</span>
                       {p.status === 'draft' ? (
                          <Badge variant="outline" className="gap-1.5 text-orange-600 border-orange-600/50 bg-orange-50 dark:bg-orange-900/20">
                              <Edit className="h-3 w-3" /> Draft
                          </Badge>
                      ) : (
                          <Badge variant="outline" className="gap-1.5 text-green-600 border-green-600/50 bg-green-50 dark:bg-green-900/20">
                              <CheckCircle className="h-3 w-3" /> Published
                          </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center border-2 border-dashed rounded-lg p-12">
              <h3 className="text-xl font-medium">No Puzzles Yet</h3>
              <p className="mt-2 text-muted-foreground">Get started by creating your first crossword puzzle.</p>
              <Button asChild className="mt-4">
                 <Link href="/new">
                    <Grid2x2Plus className="h-4 w-4 mr-2" /> Create New Puzzle
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
