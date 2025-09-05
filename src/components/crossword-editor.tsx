
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Share2, LoaderCircle, LogIn, CheckCircle, Edit, Rocket, Grid2x2, Play } from 'lucide-react';
import { useCrossword, createGrid } from '@/hooks/use-crossword';
import { CrosswordGridEdit } from '@/components/crossword-grid-edit';
import { ClueLists } from '@/components/clue-lists';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import type { Puzzle, PuzzleDoc } from '@/lib/types';
import { AuthDialog } from '@/components/auth-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { app, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AccountDropdown } from './account-dropdown';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { PuzzleStatsCard } from './puzzle-stats-card';
import { PuzzlePreviewDialog } from './puzzle-preview-dialog';
import { SharePuzzleDialog } from './share-puzzle-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';


interface CrosswordEditorProps {
  puzzleId: string;
}

export function CrosswordEditor({ puzzleId }: CrosswordEditorProps) {
  const [user, setUser] = useState<User | null>(null);
  const [initialPuzzle, setInitialPuzzle] = useState<Puzzle | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
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
    setIsPublishDialogOpen(false);
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
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-card p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <Link href="/home">
              <LogoIcon className="h-8 w-8 text-primary" />
            </Link>
            <h1 className="sr-only text-xl font-bold tracking-tight text-primary">FlashWord</h1>
          </div>
          <Input
            placeholder="Untitled Puzzle"
            className="w-72 text-lg font-semibold"
            value={crossword.title}
            onChange={(e) => crossword.setTitle(e.target.value)}
          />
          {getSaveStatus()}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {crossword.status === 'published' && (
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/play/${puzzleId}`}>
                        <Play className="h-4 w-4" />
                        <span className="sr-only sm:not-sr-only sm:ml-2">Play</span>
                    </Link>
                </Button>
            )}
            <Button variant="outline" size="sm" title="Share puzzle" onClick={() => setIsShareOpen(true)} disabled={crossword.status === 'draft'}>
              <Share2 className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Share</span>
            </Button>
            {crossword.status === 'draft' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="inline-block"> 
                        <Button size="sm" onClick={() => setIsPublishDialogOpen(true)} disabled={!canPublish}>
                            <Rocket className="mr-2 h-4 w-4" />
                            Publish
                        </Button>
                      </div>
                    </TooltipTrigger>
                    {!canPublish && (
                        <TooltipContent>
                            <p>Fill all answers and clues to publish.</p>
                        </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
            )}
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/home">
                    <Grid2x2 className="mr-2 h-4 w-4" />
                    My Puzzles
                  </Link>
                </Button>
                <AccountDropdown user={user} />
              </>
            ) : (
              <Button size="sm" onClick={() => setIsAuthDialogOpen(true)} title="Login / Sign Up" variant="default">
                <LogIn className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Login / Sign Up</span>
              </Button>
            )}
          </div>
        </div>
      </header>

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
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
      <AlertDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to publish?</AlertDialogTitle>
            <AlertDialogDescription>
              Once published, your puzzle will be publicly accessible and you will not be able to make major edits to the grid layout. You can still edit clues.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PuzzlePreviewDialog 
        isOpen={isPreviewOpen} 
        onOpenChange={setIsPreviewOpen}
        puzzle={{...crossword, ...stats}}
      />
      <SharePuzzleDialog 
        isOpen={isShareOpen} 
        onOpenChange={setIsShareOpen}
        puzzleId={puzzleId}
      />
    </div>
  );
}
