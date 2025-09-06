
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, DocumentData, doc, getDoc, OrderByDirection, writeBatch } from 'firebase/firestore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoIcon } from '@/components/icons';
import { app, db } from '@/lib/firebase';
import type { Puzzle, PuzzleDoc } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCrosswordStore } from '@/store/crossword-store';
import { Grid2x2Plus, LoaderCircle, LogOut, User, CheckCircle, Edit, Grid2x2, ArrowUpDown, Trash2, Share2, X } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { createGrid } from '@/hooks/use-crossword';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// A type for the puzzles listed on the home page, which might have less data
type PuzzleListing = Pick<PuzzleDoc, 'title' | 'size' | 'status' | 'grid' | 'entries'> & { id: string, completion: number };

type SortOption = {
    field: 'updatedAt' | 'createdAt' | 'title' | 'size';
    direction: OrderByDirection;
    label: string;
}

const SORT_OPTIONS: SortOption[] = [
    { field: 'updatedAt', direction: 'desc', label: 'Last Updated' },
    { field: 'createdAt', direction: 'desc', label: 'Date Created (Newest)' },
    { field: 'createdAt', direction: 'asc', label: 'Date Created (Oldest)' },
    { field: 'title', direction: 'asc', label: 'Title (A-Z)' },
    { field: 'title', direction: 'desc', label: 'Title (Z-A)' },
    { field: 'size', direction: 'asc', label: 'Size (Smallest)' },
    { field: 'size', direction: 'desc', label: 'Size (Largest)' },
];

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [puzzles, setPuzzles] = useState<PuzzleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]);
  const [selectedPuzzles, setSelectedPuzzles] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const setPuzzle = useCrosswordStore(state => state.setPuzzle);

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
      // Initial load or user change, don't set loading to false yet
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
      if (user) {
          fetchPuzzles(user.uid);
      } else {
          setIsLoading(false);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sortOption]);
  
  const calculateCompletion = (puzzle: PuzzleDoc): number => {
    if (!puzzle.grid || !puzzle.entries) return 0;

    const whiteSquareCount = puzzle.grid.flat().filter(cell => cell !== '#').length;
    if (whiteSquareCount === 0) return 100;
    
    let filledSquareCount = 0;
    puzzle.grid.forEach(row => {
        for (const char of row) {
            if (char !== '#' && char !== '.') {
                filledSquareCount++;
            }
        }
    });

    const answerCompletion = (filledSquareCount / whiteSquareCount) * 100;
    
    const totalClues = puzzle.entries.length;
    if (totalClues === 0) return answerCompletion; // Avoid division by zero
    
    const filledClues = puzzle.entries.filter(e => e.clue && e.clue.trim() !== '').length;
    const clueCompletion = (filledClues / totalClues) * 100;

    return Math.round((answerCompletion + clueCompletion) / 2);
  };


  const fetchPuzzles = async (uid: string) => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'users', uid, 'puzzles'),
        orderBy(sortOption.field, sortOption.direction)
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
            entries: data.entries,
            completion: calculateCompletion(data)
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
  
  const handlePuzzleSelect = (puzzleId: string) => {
    if (selectedPuzzles.length > 0) {
      // If selection is active, clicking a card should also toggle selection
      handleSelectionChange(puzzleId, !selectedPuzzles.includes(puzzleId));
    } else {
      if (!user) return;
      router.push(`/edit/${puzzleId}`);
    }
  };

  const handleSelectionChange = (puzzleId: string, isChecked: boolean) => {
    setSelectedPuzzles(prev => 
        isChecked 
        ? [...prev, puzzleId] 
        : prev.filter(id => id !== puzzleId)
    );
  };
  
  const clearSelection = () => {
    setSelectedPuzzles([]);
  };

  const handleDeletePuzzles = async () => {
    if (!user || selectedPuzzles.length === 0) return;
    
    const batch = writeBatch(db);
    selectedPuzzles.forEach(id => {
        const puzzleRef = doc(db, 'users', user.uid, 'puzzles', id);
        batch.delete(puzzleRef);
    });

    try {
        await batch.commit();
        toast({
            title: 'Puzzles Deleted',
            description: `${selectedPuzzles.length} puzzle(s) have been successfully deleted.`
        });
        setPuzzles(puzzles.filter(p => !selectedPuzzles.includes(p.id)));
        clearSelection();
    } catch (error) {
        console.error('Error deleting puzzles:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete the selected puzzles.',
        });
    }
    setIsDeleteDialogOpen(false);
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
            <div className="flex items-center gap-2">
                {selectedPuzzles.length > 0 ? (
                    <>
                        <Button variant="outline" size="icon" onClick={clearSelection}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Clear Selection</span>
                        </Button>
                        <span className="text-sm text-muted-foreground">{selectedPuzzles.length} selected</span>
                        <div className="flex items-center gap-2 ml-4">
                           <Button variant="outline" size="sm">
                                <Share2 className="mr-2 h-4 w-4" /> Share
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <ArrowUpDown className="mr-2 h-4 w-4" />
                                    Sort by: {sortOption.label}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {SORT_OPTIONS.map(option => (
                                    <DropdownMenuItem key={`${option.field}-${option.direction}`} onClick={() => setSortOption(option)}>
                                        {option.label}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                        <Button asChild>
                            <Link href="/new">
                                <Grid2x2Plus className="h-4 w-4 mr-2" /> Create New
                            </Link>
                        </Button>
                    </>
                )}
            </div>
          </div>

          {puzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {puzzles.map(p => (
                <Card 
                  key={p.id} 
                  className={cn(
                    "hover:shadow-md hover:border-primary/50 transition-all flex flex-col group relative",
                    selectedPuzzles.length > 0 ? "cursor-pointer" : "cursor-pointer"
                  )}
                  onClick={() => handlePuzzleSelect(p.id)}
                >
                  <Checkbox 
                    className={cn(
                      "absolute top-2 right-2 z-10 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity",
                      selectedPuzzles.includes(p.id) && "opacity-100"
                    )}
                    checked={selectedPuzzles.includes(p.id)}
                    onCheckedChange={(isChecked) => handleSelectionChange(p.id, !!isChecked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <CardHeader className="flex-1 pb-4">
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
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center text-sm text-muted-foreground pt-1">
                      <span>Size: <span className="font-semibold text-foreground">{p.size} x {p.size}</span></span>
                       {p.status === 'draft' ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-600/50 bg-orange-50 dark:bg-orange-900/20">
                              Draft
                          </Badge>
                      ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600/50 bg-green-50 dark:bg-green-900/20">
                              Published
                          </Badge>
                      )}
                    </div>
                     <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Completion</span>
                            <span>{p.completion.toFixed(0)}%</span>
                        </div>
                        <Progress value={p.completion} className="h-2" />
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

       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedPuzzles.length} puzzle(s). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePuzzles} className={buttonVariants({ variant: "destructive" })}>
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    
