
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
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
import { Input } from './ui/input';

interface CrosswordBuilderProps {
  puzzle: Puzzle;
  onNew: () => void;
  onLoad: (puzzle: Puzzle) => void;
}

export function CrosswordBuilder({ puzzle, onNew, onLoad }: CrosswordBuilderProps) {
  const [user, setUser] = useState<User | null>(null);
  const { crossword, isSaving, lastSaved } = useCrossword(puzzle.size, puzzle.grid, puzzle.clues, puzzle.title, puzzle.id, user);

  const [isVerifying, setIsVerifying] = useState(false);
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

  const getSaveStatus = () => {
    if (isSaving) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <LoaderCircle className="animate-spin" /> Saving...
        </div>
      );
    }
    if (lastSaved) {
      return <span className="text-muted-foreground text-sm">All changes saved</span>;
    }
    return null;
  };


  return (
    <div className="flex flex-col h-screen font-body text-foreground bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <LogoIcon className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold tracking-tight text-primary sr-only">FlashWord</h1>
          </div>
          <Input 
            placeholder="Untitled Puzzle" 
            className="text-lg font-semibold w-72"
            value={crossword.title}
            onChange={(e) => crossword.setTitle(e.target.value)}
          />
           {getSaveStatus()}
        </div>
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" title="Export to PDF (coming soon)" disabled>
              <Download className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only sm:ml-2">Export</span>
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            {user ? (
              <>
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
        <div className="lg:col-span-2 md:col-span-1 h-full">
          <ClueLists
            clues={crossword.clues}
            selectedClue={crossword.selectedClue}
            onSelectClue={crossword.setSelectedClue}
            onClueTextChange={crossword.updateClueText}
            getWordFromGrid={crossword.getWordFromGrid}
          />
        </div>
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
      </main>
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </div>
  );
}
