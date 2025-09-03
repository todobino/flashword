
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoIcon } from '@/components/icons';
import { app, db } from '@/lib/firebase';
import type { Puzzle } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCrosswordStore } from '@/store/crossword-store';
import { FilePlus, LoaderCircle, LogOut } from 'lucide-react';

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
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
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPuzzles = async (uid: string) => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'puzzles'),
        where('owner', '==', uid),
        orderBy('updatedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const userPuzzles = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Puzzle[];
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

  const handleLogout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    toast({ title: 'Logged out successfully.' });
    router.push('/');
  };
  
  const handlePuzzleSelect = (puzzle: Puzzle) => {
    setPuzzle(puzzle);
    router.push('/builder');
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
            <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Logout</span>
            </Button>
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
                  onClick={() => handlePuzzleSelect(p)}
                >
                  <CardHeader>
                    <CardTitle className="truncate">{p.title || 'Untitled Puzzle'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{p.size} x {p.size}</span>
                       <Badge variant="outline">Draft</Badge>
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
