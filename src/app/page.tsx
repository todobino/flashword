
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
import { FilePlus, LoaderCircle, LogOut, User } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { createGrid } from '@/hooks/use-crossword';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';

// A type for the puzzles listed on the home page, which might have less data
type PuzzleListing = Pick<PuzzleDoc, 'title' | 'size' | 'status'> & { id: string };

export default function RootPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const { puzzle, setPuzzle, clearPuzzle } = useCrosswordStore();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        fetchPuzzles(user.uid);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
            status: data.status,
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
    const puzzleDocRef = doc(db, 'users', user.uid, 'puzzles', puzzleId);
    const puzzleDocSnap = await getDoc(puzzleDocRef);

    if (puzzleDocSnap.exists()) {
        const docData = puzzleDocSnap.data() as PuzzleDoc;

        const newGrid = createGrid(docData.size);
        docData.grid.forEach((rowStr, r) => {
            for (let c = 0; c < docData.size; c++) {
                const char = rowStr[c];
                if (char === '#') {
                    newGrid[r][c].isBlack = true;
                } else if (char !== '.') {
                    newGrid[r][c].char = char;
                }
            }
        });

        const newClues = {
            across: docData.entries.filter(e => e.direction === 'across'),
            down: docData.entries.filter(e => e.direction === 'down'),
        };

        setPuzzle({
            id: puzzleDocSnap.id,
            title: docData.title,
            size: docData.size,
            grid: newGrid,
            clues: newClues,
        });
        router.push('/edit');
    }
  };

   const handleStartBuilder = (puzzle: Puzzle) => {
        setPuzzle(puzzle);
        router.push('/edit');
    };

    const handleLoad = (puzzle: Puzzle) => {
        setPuzzle(puzzle);
        router.push('/edit');
    };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <NewPuzzleWizard onStartBuilder={handleStartBuilder} onLoad={handleLoad} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" asChild>
                <Link href="/home">
                    My Puzzles
                </Link>
            </Button>
            <AccountDropdown user={user} />
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">My Puzzles</h2>
            <Button asChild>
                <Link href="/new">
                    <FilePlus className="h-4 w-4 mr-2" /> Create New
                </Link>
            </Button>
          </div>

          {puzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {puzzles.map(p => (
                <Card 
                  key={p.id} 
                  className="hover:shadow-md hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => handlePuzzleSelect(p.id)}
                >
                  <CardHeader>
                    <CardTitle className="truncate">{p.title || 'Untitled Puzzle'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{p.size} x {p.size}</span>
                       <Badge variant="outline">{p.status}</Badge>
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
                    <FilePlus className="h-4 w-4 mr-2" /> Create New Puzzle
                </Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
