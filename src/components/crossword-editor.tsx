
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { LoaderCircle, CheckCircle } from 'lucide-react';
import { useCrossword, createGrid } from '@/hooks/use-crossword';
import { CrosswordGridEdit } from '@/components/crossword-grid-edit';
import { ClueLists } from '@/components/clue-lists';
import { useToast } from '@/hooks/use-toast';
import type { Puzzle, PuzzleDoc } from '@/lib/types';
import { app, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { PuzzleStatsCard } from './puzzle-stats-card';
import { PuzzlePreviewDialog } from './puzzle-preview-dialog';
import { AppHeader } from './app-header';


interface CrosswordEditorProps {
  puzzleId: string;
}

export function CrosswordEditor({ puzzleId }: CrosswordEditorProps) {
  const [user, setUser] = useState<User | null>(null);
  const [initialPuzzle, setInitialPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        // If user logs out, redirect to home
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!user || !puzzleId) return;

    const fetchPuzzle = async () => {
      setIsLoading(true);
      const puzzleDocRef = doc(db, 'users', user.uid, 'puzzles', puzzleId);
      try {
        const puzzleDocSnap = await getDoc(puzzleDocRef);

        if (puzzleDocSnap.exists()) {
          const docData = puzzleDocSnap.data() as PuzzleDoc;

          const newGrid = createGrid(docData.size);
          docData.grid.forEach((rowStr, r) => {
            for (let c = 0; c < docData.size; c++) {
              const char = rowStr[c] || '.';
              if (char === '#') {
                newGrid[r][c].isBlack = true;
              } else if (char !== '.') {
                newGrid[r][c].char = char;
              }
            }
          });

          const newClues = {
            across: docData.entries.filter((e) => e.direction === 'across'),
            down: docData.entries.filter((e) => e.direction === 'down'),
          };

          setInitialPuzzle({
            id: puzzleDocSnap.id,
            title: docData.title,
            size: docData.size,
            grid: newGrid,
            clues: newClues,
            status: docData.status,
            createdAt: docData.createdAt?.toDate(),
            author: user.displayName || 'Anonymous'
          });
        } else {
          toast({ variant: 'destructive', title: 'Error', description: 'Puzzle not found.' });
          router.push('/home');
        }
      } catch (error) {
        console.error("Error fetching puzzle: ", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load the puzzle.' });
        router.push('/home');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPuzzle();
  }, [puzzleId, user, router, toast]);

  const { crossword, isSaving, lastSaved, stats } = useCrossword(
    initialPuzzle?.size,
    initialPuzzle?.grid,
    initialPuzzle?.clues,
    initialPuzzle?.title,
    initialPuzzle?.id,
    user,
    initialPuzzle?.status,
    initialPuzzle?.createdAt,
    initialPuzzle?.author,
  );

  const handlePublish = async () => {
    await crossword.publishPuzzle();
  };
  
  const canPublish = stats.answersCompletion === 100 && stats.cluesCompletion === 100;

  const getSaveStatus = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" /> Saving...
        </div>
      );
    }
    if (lastSaved) {
      return (
        <div className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" /> Saved!
        </div>
      );
    }
    return null;
  };
  
  if (isLoading || !initialPuzzle) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background font-body text-foreground">
      <AppHeader 
        variant="editor"
        title={crossword.title}
        onTitleChange={crossword.setTitle}
        puzzleId={puzzleId}
        status={crossword.status}
        onPublish={handlePublish}
        canPublish={canPublish}
        saveStatus={getSaveStatus()}
      />

      <main className="flex-1 grid md:grid-cols-4 gap-6 p-2 md:p-3 overflow-hidden">
        <div className="md:col-span-1 h-full overflow-y-auto">
           <ClueLists
            clues={crossword.clues}
            selectedClue={crossword.selectedClue}
            onSelectClue={crossword.setSelectedClue}
            onClueTextChange={crossword.updateClueText}
            getWordFromGrid={crossword.getWordFromGrid}
          />
        </div>
        <div className="md:col-span-2 flex items-center justify-center">
          <CrosswordGridEdit
            grid={crossword.grid}
            size={crossword.size}
            onCharChange={crossword.updateCellChar}
            selectedClue={crossword.selectedClue}
            currentClueDetails={crossword.currentClueDetails}
            onSelectClue={crossword.setSelectedClue}
          />
        </div>
         <div className="md:col-span-1 h-full overflow-y-auto">
            <PuzzleStatsCard 
                title={crossword.title}
                status={crossword.status}
                stats={stats}
                author={crossword.author}
                createdAt={crossword.createdAt}
                onPreview={() => setIsPreviewOpen(true)}
            />
        </div>
      </main>
      <PuzzlePreviewDialog 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen}
        puzzle={{...crossword, ...stats}}
      />
    </div>
  );
}
