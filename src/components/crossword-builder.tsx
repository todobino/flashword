'use client';

import { useState } from 'react';
import { Download, Grid as GridIcon, Save, Sparkles, CheckCircle, LoaderCircle, Trash2 } from 'lucide-react';
import { useCrossword } from '@/hooks/use-crossword';
import { CrosswordGrid } from '@/components/crossword-grid';
import { ClueLists } from '@/components/clue-lists';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogoIcon } from '@/components/icons';
import { verifyPuzzleAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


export function CrosswordBuilder() {
  const crossword = useCrossword(15);
  const [isVerifying, setIsVerifying] = useState(false);
  const { toast } = useToast();

  const handleVerify = async () => {
    setIsVerifying(true);
    toast({ title: 'Verifying puzzle...', description: 'AI is checking your clues and answers.' });
    
    const acrossClues = Object.fromEntries(crossword.clues.across.map(c => [c.number, c.text]));
    const downClues = Object.fromEntries(crossword.clues.down.map(c => [c.number, c.text]));
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
  
  const handleNewPuzzle = () => {
    crossword.setSize(crossword.size);
  }

  return (
    <div className="flex flex-col h-screen font-body text-foreground bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlossWord</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <GridIcon className="h-5 w-5 text-muted-foreground" />
            <Select value={String(crossword.size)} onValueChange={(val) => crossword.setSize(Number(val))}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Grid size" />
              </SelectTrigger>
              <SelectContent>
                {[15, 17, 19, 21].map(s => <SelectItem key={s} value={String(s)}>{s} x {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" title="New Puzzle">
                <Trash2 className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">New</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create a new blank puzzle and discard all current changes. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleNewPuzzle}>Continue</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button variant="outline" size="sm" onClick={crossword.savePuzzle} title="Save Puzzle">
            <Save className="h-4 w-4" />
             <span className="sr-only sm:not-sr-only sm:ml-2">Save</span>
          </Button>
          <Button variant="outline" size="sm" onClick={crossword.loadPuzzle} title="Load Puzzle">
            <Sparkles className="h-4 w-4" />
             <span className="sr-only sm:not-sr-only sm:ml-2">Load</span>
          </Button>
          <Button variant="outline" size="sm" title="Export to PDF (coming soon)" disabled>
            <Download className="h-4 w-4" />
             <span className="sr-only sm:not-sr-only sm:ml-2">Export</span>
          </Button>
          <Button size="sm" onClick={handleVerify} disabled={isVerifying} title="Verify Puzzle">
            {isVerifying ? <LoaderCircle className="animate-spin" /> : <CheckCircle />}
             <span className="sr-only sm:not-sr-only sm:ml-2">Verify</span>
          </Button>
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
    </div>
  );
}
