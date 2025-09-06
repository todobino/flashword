
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, DocumentData, doc, getDoc, OrderByDirection, deleteDoc, writeBatch } from 'firebase/firestore';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LogoIcon } from '@/components/icons';
import { app, db } from '@/lib/firebase';
import type { Puzzle, PuzzleDoc } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useCrosswordStore } from '@/store/crossword-store';
import { Grid2x2Plus, LoaderCircle, LogOut, User, CheckCircle, Edit, Grid2x2, ArrowUpDown, Trash2, Share2, X, Check, MoreHorizontal, Play, ListFilter, XCircle, Rows, CheckSquare } from 'lucide-react';
import { AccountDropdown } from '@/components/account-dropdown';
import { createGrid } from '@/hooks/use-crossword';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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

type StatusFilter = 'all' | 'draft' | 'published';

export default function HomePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [allPuzzles, setAllPuzzles] = useState<PuzzleListing[]>([]);
  const [filteredPuzzles, setFilteredPuzzles] = useState<PuzzleListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [puzzleToDelete, setPuzzleToDelete] = useState<string | null>(null);
  const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
  const [selectedPuzzles, setSelectedPuzzles] = useState<string[]>([]);
  const [isBulkDeleteAlertOpen, setIsBulkDeleteAlertOpen] = useState(false);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
      } else {
        router.push('/');
      }
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
  }, [user]);

  useEffect(() => {
    let newFilteredPuzzles = [...allPuzzles];
    
    // Apply sorting
    newFilteredPuzzles.sort((a, b) => {
      const fieldA = a[sortOption.field as keyof PuzzleListing] ?? 0;
      const fieldB = b[sortOption.field as keyof PuzzleListing] ?? 0;
      const dir = sortOption.direction === 'asc' ? 1 : -1;
      
      if (fieldA < fieldB) return -1 * dir;
      if (fieldA > fieldB) return 1 * dir;
      return 0;
    });

    // Apply filtering
    if (statusFilter !== 'all') {
      newFilteredPuzzles = newFilteredPuzzles.filter(p => p.status === statusFilter);
    }
    
    setFilteredPuzzles(newFilteredPuzzles);
  }, [allPuzzles, sortOption, statusFilter]);
  
  
  const calculateCompletion = (puzzle: PuzzleDoc): number => {
    if (!puzzle.grid || !puzzle.entries) return 0;

    const gridString = puzzle.grid.join('');
    const whiteSquareCount = gridString.replace(/\./g, ' ').replace(/#/g, '').length;
    if (whiteSquareCount === 0) return 100;
    
    const filledSquareCount = gridString.replace(/[^A-Z]/gi, '').length;
    
    const answerCompletion = whiteSquareCount > 0 ? (filledSquareCount / whiteSquareCount) * 100 : 0;
    
    const totalClues = puzzle.entries.length;
    if (totalClues === 0) {
      return Math.round(Math.min(answerCompletion, 100));
    }
    
    const filledClues = puzzle.entries.filter(e => e.clue && e.clue.trim() !== '').length;
    const clueCompletion = (filledClues / totalClues) * 100;

    return Math.round(Math.min((answerCompletion + clueCompletion) / 2, 100));
  };


  const fetchPuzzles = async (uid: string) => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users', uid, 'puzzles'), orderBy(sortOption.field, sortOption.direction));
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
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            completion: calculateCompletion(data)
          }
      }) as (PuzzleListing & { createdAt: Date, updatedAt: Date });
      setAllPuzzles(userPuzzles);
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
  
  const handleDeletePuzzle = async () => {
    if (!user || !puzzleToDelete) return;
    
    const puzzleRef = doc(db, 'users', user.uid, 'puzzles', puzzleToDelete);

    try {
        await deleteDoc(puzzleRef);
        toast({
            title: 'Puzzle Deleted',
            description: `The puzzle has been successfully deleted.`
        });
        setAllPuzzles(allPuzzles.filter(p => p.id !== puzzleToDelete));
    } catch (error) {
        console.error('Error deleting puzzle:', error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not delete the puzzle.',
        });
    }
    setPuzzleToDelete(null);
  };

  const handleBulkDelete = async () => {
    if (!user || selectedPuzzles.length === 0) return;
    
    const batch = writeBatch(db);
    selectedPuzzles.forEach(id => {
      const puzzleRef = doc(db, 'users', user.uid, 'puzzles', id);
      batch.delete(puzzleRef);
    });

    try {
      await batch.commit();
      toast({
        title: `${selectedPuzzles.length} Puzzles Deleted`,
        description: 'The selected puzzles have been removed.'
      });
      setAllPuzzles(allPuzzles.filter(p => !selectedPuzzles.includes(p.id)));
      setSelectedPuzzles([]);
      setIsBulkSelectMode(false);
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        variant: 'destructive',
        title: 'Bulk Delete Failed',
        description: 'Could not delete the selected puzzles.'
      });
    }
    setIsBulkDeleteAlertOpen(false);
  };
  
  const handleStartBulkSelect = (puzzleId: string) => {
    setIsBulkSelectMode(true);
    setSelectedPuzzles([puzzleId]);
  };
  
  const toggleBulkSelectMode = () => {
    setIsBulkSelectMode(!isBulkSelectMode);
    setSelectedPuzzles([]); // Reset selection when toggling mode
  };
  
  const handleSelectPuzzle = (puzzleId: string) => {
    setSelectedPuzzles(prev => 
      prev.includes(puzzleId) ? prev.filter(id => id !== puzzleId) : [...prev, puzzleId]
    );
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
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-20 bg-card">
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
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <ListFilter className="mr-2 h-4 w-4" />
                            Filter
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                         <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                         <DropdownMenuCheckboxItem checked={statusFilter === 'all'} onCheckedChange={() => setStatusFilter('all')}>All</DropdownMenuCheckboxItem>
                         <DropdownMenuCheckboxItem checked={statusFilter === 'draft'} onCheckedChange={() => setStatusFilter('draft')}>Draft</DropdownMenuCheckboxItem>
                         <DropdownMenuCheckboxItem checked={statusFilter === 'published'} onCheckedChange={() => setStatusFilter('published')}>Published</DropdownMenuCheckboxItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <ArrowUpDown className="mr-2 h-4 w-4" />
                            {sortOption.label}
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
            </div>
          </div>
          
           {isBulkSelectMode && (
                <div className="sticky top-[65px] z-10 bg-primary/10 border-primary/20 border rounded-lg p-2 mb-4 flex justify-between items-center animate-in fade-in-50">
                    <span className="text-sm font-medium text-primary">{selectedPuzzles.length} puzzle{selectedPuzzles.length !== 1 ? 's' : ''} selected</span>
                    <div className="flex items-center space-x-2">
                        <Button variant="destructive" size="sm" onClick={() => setIsBulkDeleteAlertOpen(true)} disabled={selectedPuzzles.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                        </Button>
                         <Button variant="outline" size="sm" onClick={toggleBulkSelectMode}>
                           Cancel
                        </Button>
                    </div>
                </div>
            )}

          {filteredPuzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredPuzzles.map(p => (
                <Card 
                  key={p.id} 
                  className={cn(
                    "transition-all flex flex-col group relative hover:border-primary",
                    isBulkSelectMode && "cursor-pointer",
                    selectedPuzzles.includes(p.id) && "border-primary ring-2 ring-primary"
                  )}
                  onClick={isBulkSelectMode ? () => handleSelectPuzzle(p.id) : undefined}
                >
                    {!isBulkSelectMode ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="h-5 w-5" />
                                    <span className="sr-only">Actions</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => router.push(`/edit/${p.id}`)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    <span>Edit</span>
                                </DropdownMenuItem>
                                {p.status === 'published' && (
                                    <>
                                        <DropdownMenuItem onClick={() => router.push(`/play/${p.id}`)}>
                                            <Play className="mr-2 h-4 w-4" />
                                            <span>Play</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => router.push(`/play/${p.id}`)}>
                                            <Share2 className="mr-2 h-4 w-4" />
                                            <span>Share</span>
                                        </DropdownMenuItem>
                                    </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleStartBulkSelect(p.id)}>
                                    <CheckSquare className="mr-2 h-4 w-4" />
                                    <span>Select</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-red-500 focus:text-red-500 focus:bg-red-50" onClick={() => setPuzzleToDelete(p.id)}>
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                         <div
                            className="absolute top-3 right-3 z-10"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSelectPuzzle(p.id);
                            }}
                        >
                            <Checkbox
                                checked={selectedPuzzles.includes(p.id)}
                                className={cn(
                                    "h-8 w-8 rounded-full border-2 border-gray-400 bg-white/80 backdrop-blur-sm shadow-lg transition-opacity",
                                    "[&[data-state=unchecked]]:hover:border-primary",
                                )}
                                aria-label={`Select puzzle ${p.title}`}
                            >
                                <Check
                                    className={cn(
                                        "h-5 w-5 transition-colors",
                                        selectedPuzzles.includes(p.id)
                                            ? "text-white"
                                            : "text-gray-400/80 group-hover:text-primary"
                                    )}
                                />
                            </Checkbox>
                        </div>
                    )}


                  <Link href={`/edit/${p.id}`} className={cn("flex-1 flex flex-col", isBulkSelectMode && "pointer-events-none")}>
                    <CardHeader className="flex-1 pb-4">
                       {p.grid && (
                          <div 
                              className="aspect-square w-full bg-muted/20 rounded-md p-1.5 mb-4 border"
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
                  </Link>
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

       <AlertDialog open={!!puzzleToDelete} onOpenChange={(open) => !open && setPuzzleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this puzzle. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPuzzleToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePuzzle} className={buttonVariants({ variant: "destructive" })}>
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isBulkDeleteAlertOpen} onOpenChange={setIsBulkDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPuzzles.length} Puzzles?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the selected puzzles. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className={buttonVariants({ variant: "destructive" })}>
                Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
