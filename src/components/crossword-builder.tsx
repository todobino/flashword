
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Download, Save, Sparkles, CheckCircle, LoaderCircle, LogIn, LogOut, FilePlus, FolderOpen, Copy, Home, User as UserIcon } from 'lucide-react';
import { useCrossword } from '@/hooks/use-crossword';
import { CrosswordGrid } from '@/components/crossword-grid';
import { ClueLists } from '@/components/clue-lists';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons';
import { verifyPuzzleAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import type { Puzzle } from '@/lib/types';
import { AuthDialog } from '@/components/auth-dialog';
import { app, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { AccountDropdown } from './account-dropdown';
import { Separator } from './ui/separator';

interface CrosswordBuilderProps {
  puzzle: Puzzle;
  onNew: () => void;
  onLoad: (puzzle: Puzzle) => void;
}

export function CrosswordBuilder({ puzzle, onNew, onLoad }: CrosswordBuilderProps) {
  const [user, setUser] = useState<User | null>(null);
  const crossword = useCrossword(puzzle.size, puzzle.grid, puzzle.clues, puzzle.title, puzzle.id, user);

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    crossword.resetGrid(puzzle.size, puzzle.grid, puzzle.clues, puzzle.title, puzzle.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzle]);

  
  const handleVerify = async () => {
    setIsVerifying(true);
    toast({ title: 'Verifying puzzle...', description: 'AI is checking your clues and answers.' });
    
    const acrossClues = Object.fromEntries(crossword.clues.across.map(c => [c.number, c.clue]));
    const downClues = Object.fromEntries(crossword.clues.down.map(c => [c.number, c.clue]));
    const answers = [...crossword.clues.across, ...crossword.clues.down].reduce((acc, clue) => {
      const word = crossword.getWordFromGrid(clue).replace(/_/g, ' ');
      acc[`${clue.number} ${clue.direction}`] = word;
      return acc;
    }, {} as Record<string, string>);

    const puzzleGrid = crossword.grid.map(row => row.map(cell => cell.isBlack ? '.' : (cell.char || ' ')));

    const result = await verifyPuzzleAction({ puzzleGrid, acrossClues, downClues, answers });
    setIsVerifying(false);

    if (result.success && result.data) {
      if (result.data.isValid) {
        toast({ title: 'Verification Complete!', description: 'Your puzzle is valid.', variant: 'default' });
      } else {
        toast({
          variant: 'destructive',
          title: 'Verification Failed',
          description: (
            <div>
              <p>Found {result.data.errors.length} errors:</p>
              <ul className="mt-2 list-disc list-inside">
                {result.data.errors.map((error, i) => <li key={i}>{error}</li>)}
              </ul>
            </div>
          ),
          duration: 9000,
        });
      }
    } else {
      toast({ variant: 'destructive', title: 'Verification Error', description: result.error });
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    await crossword.savePuzzle();
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col h-screen font-body text-foreground bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" title="Export to PDF (coming soon)" disabled>
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Export</span>
            </Button>
            <Button size="sm" onClick={handleVerify} disabled={isVerifying} title="Verify Puzzle">
              {isVerifying ? <LoaderCircle className="animate-spin" /> : <CheckCircle />}
              <span className="sr-only sm:not-sr-only sm:ml-2">Verify</span>
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} title="Save Puzzle">
                  {isSaving ? <LoaderCircle className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                  <span className="sr-only sm:not-sr-only sm:ml-2">Save</span>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/home">My Puzzles</Link>
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

      <main className="flex-1 grid md:grid-cols-2 lg:grid-cols-5 gap-6 p-4 md:p-6 overflow-hidden">
        <div className="lg:col-span-3 md:col-span-1 h-full flex items-center justify-center">
          <CrosswordGrid
            grid={crossword.grid}
            size={crossword.size}
            onCellClick={crossword.toggleCellBlack}
            onCharChange={crossword.updateCellChar}
            selectedClue={crossword.selectedClue}
            currentClueDetails={crossword.currentClueDetails}
            onSelectClue={crossword.setSelectedClue}
          />
        </div>
        <div className="lg:col-span-2 md:col-span-1 h-full">
          <ClueLists
            clues={crossword.clues}
            selectedClue={crossword.selectedClue}
            onSelectClue={crossword.setSelectedClue}
            onClueTextChange={crossword.updateClueText}
            getWordFromGrid={crossword.getWordFromGrid}
          />
        </div>
      </main>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </div>
  );
}
