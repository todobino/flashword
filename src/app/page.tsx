
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

export default function RootPage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { setPuzzle } = useCrosswordStore();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/home');
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleStartBuilder = (puzzle: Puzzle) => {
    if (!puzzle.id) {
        console.error("Cannot redirect, puzzle ID is missing.");
        return;
    }
    router.push(`/edit/${puzzle.id}`);
  };

  const handleLoad = (puzzle: Puzzle) => {
    if (!puzzle.id) {
        console.error("Cannot redirect, puzzle ID is missing.");
        return;
    }
    router.push(`/edit/${puzzle.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    );
  }

  // If not loading and not logged in, show the wizard
  // If logged in, the useEffect will have already redirected to /home
  return <NewPuzzleWizard onStartBuilder={handleStartBuilder} onLoad={handleLoad} />;
}
