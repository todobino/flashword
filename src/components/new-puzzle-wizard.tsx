'use client';

import { useState, useMemo, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { Download, Save, CheckCircle, LoaderCircle, LogIn, LogOut, ArrowLeft, ArrowRight, RotateCw, Shuffle, FilePlus, FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/icons';
import { useCrossword } from '@/hooks/use-crossword';
import type { Clue } from '@/lib/types';
import { CrosswordGrid } from './crossword-grid';
import { cn } from '@/lib/utils';
import { ClueLists } from './clue-lists';
import { useToast } from '@/hooks/use-toast';
import { AuthDialog } from '@/components/auth-dialog';
import { app } from '@/lib/firebase';
import { verifyPuzzleAction } from '@/app/actions';


interface NewPuzzleWizardProps {
}

const SIZES = [
    { size: 15, label: 'NYT Standard' },
    { size: 17, label: 'Common Variant' },
    { size: 19, label: 'Common Variant' },
    { size: 21, label: 'NYT Sunday' }
];

const SizeTile = ({ s, label, isSelected, onSelect }: { s: number, label: string, isSelected: boolean, onSelect: (size: number) => void}) => {
  return (
    <div
      onClick={() => onSelect(s)}
      className={cn(
        'border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center',
        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="grid grid-cols-4 gap-0.5 w-8 h-8 bg-muted-foreground/20">
        {Array(16).fill(0).map((_, i) => <div key={i} className="bg-background" />)}
      </div>
      <div className="flex flex-col">
        <span className="font-semibold">{s} x {s}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

const WIZARD_STEPS = [
  { step: 1, title: 'Choose your grid size.' },
  { step: 2, title: 'Design your grid pattern.' },
  { step: 3, title: 'Define your puzzle theme.' },
  { step: 4, title: 'Build your puzzle.' }
];


export function NewPuzzleWizard({}: NewPuzzleWizardProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState(15);
  const [title, setTitle] = useState('');
  const crossword = useCrossword(size);

  const [isVerifying, setIsVerifying] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleNext = () => {
    if (step === 1) { // Move from Size to Design
      crossword.resetGrid(size);
    }
    if (step < 4) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(s => s - 1);
    }
  };
  
  const handleSizeSelect = (newSize: number) => {
    setSize(newSize);
  };

  const handleReset = () => {
    crossword.resetGrid(size);
  }

  const handleRandomize = () => {
    crossword.randomizeGrid();
  }
  
  const themers = useMemo(() => {
    if (step !== 3) return [];
    const allClues = [...crossword.clues.across, ...crossword.clues.down];
    allClues.sort((a,b) => b.length - a.length);
    const longest = allClues.length > 0 ? allClues[0].length : 0;
    return allClues.filter(c => c.length >= Math.max(7, longest - 2));
  }, [crossword.clues, step]);

  const CurrentStepDescription = () => {
    switch (step) {
      case 1:
        return <p>Select a standard crossword size. Larger puzzles are more challenging to create and solve.</p>;
      case 2:
        return (
          <div className="space-y-4">
            <p>Click and drag to make squares black. Or, just randomize it! The best patterns follow these rules:</p>
            <ul className="space-y-2 list-disc list-inside text-xs">
               <li><b>Connectivity:</b> All white squares must be connected (no isolated sections).</li>
               <li><b>Word Lengths:</b> Minimum 3 letters per word (no 2-letter entries).</li>
               <li><b>Balance:</b> Roughly equal Across and Down entries.</li>
               <li><b>Black Squares:</b> Usually ≤ 1/6 of total grid; should not split the puzzle into disjoint regions.</li>
            </ul>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4">
            <p>A good theme is the heart of a memorable crossword. Here are some tips:</p>
            <ul className="space-y-2 list-disc list-inside text-xs">
              <li><b>Themers:</b> These are the longest entries, often symmetrical, that share a common idea.</li>
              <li><b>The "Revealer":</b> Often, one of the theme answers explains the gimmick. A solver might not get it at first, but it provides an "aha!" moment that helps solve the other themers.</li>
              <li><b>Wordplay:</b> Themes often rely on puns, shared categories, or other clever wordplay. For example, a theme like "SUPER VEGGIES" might have answers where vegetables are part of superhero names.</li>
            </ul>
          </div>
        );
       case 4:
         return <p>Fill in the remaining answers and clues. Use the AI tools to help you finish, then save or export your puzzle.</p>
      default:
        return null;
    }
  }

  const handleLogout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    toast({ title: 'Logged out successfully.' });
  };
  
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

  const renderStepContent = () => {
    if (step === 4) {
      return (
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
      );
    }

    return (
      <main className="flex-1 flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-7xl grid gap-8 md:grid-cols-2">
          <div className="flex-col justify-center space-y-4 hidden md:flex">
              <div className="bg-card border rounded-lg p-6">
                  <CardTitle className="mb-2">Create a New Crossword</CardTitle>
                  <CardDescription>
                      Step {step} of 4: {WIZARD_STEPS[step - 1].title}
                  </CardDescription>
              </div>
              <div className="text-sm text-muted-foreground p-4">
                <CurrentStepDescription />
              </div>
          </div>
          <Card className="overflow-hidden">
              <CardContent className="p-6">
              {step === 1 && (
                  <div className="flex flex-col gap-4 items-center">
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-4 w-full p-4">
                          {SIZES.map(s => (
                          <SizeTile key={s.size} s={s.size} label={s.label} isSelected={size === s.size} onSelect={handleSizeSelect} />
                          ))}
                      </div>
                  </div>
              )}
              {step === 2 && (
                  <div className="space-y-4 flex flex-col items-center">
                      <div className="w-full max-w-md">
                          <CrosswordGrid
                              grid={crossword.grid}
                              size={size}
                              onCellClick={crossword.toggleCellBlack}
                              onCharChange={() => {}}
                              selectedClue={null}
                              currentClueDetails={null}
                              onSelectClue={() => {}}
                              designMode={true}
                          />
                      </div>
                      <div className="flex gap-2">
                          <Button variant="outline" onClick={handleReset}><RotateCw className="mr-2 h-4 w-4" /> Reset</Button>
                          <Button variant="outline" onClick={handleRandomize}><Shuffle className="mr-2 h-4 w-4" /> Randomize</Button>
                      </div>
                  </div>
              )}
              {step === 3 && (
                   <div className="space-y-6">
                      <div className="space-y-2">
                          <Label htmlFor="puzzle-title">Puzzle Title</Label>
                          <Input id="puzzle-title" placeholder="e.g., Sunday Special" value={title} onChange={(e) => setTitle(e.target.value)} />
                      </div>
                       <div className="space-y-4">
                          <Label>Theme Answers</Label>
                          <div className="space-y-3">
                          {themers.map(clue => (
                              <div key={`${clue.number}-${clue.direction}`} className="flex items-center gap-4">
                                  <span className="font-mono text-sm text-muted-foreground w-20">{clue.number} {clue.direction}</span>
                                  <Input 
                                      placeholder={`Enter ${clue.length}-letter answer...`} 
                                      maxLength={clue.length}
                                      value={crossword.getWordFromGrid(clue).replace(/_/g, '')}
                                      onChange={(e) => crossword.fillWord(clue, e.target.value)}
                                      className="font-mono uppercase tracking-widest"
                                  />
                              </div>
                          ))}
                          </div>
                       </div>
                   </div>
              )}
              </CardContent>
              <CardFooter className={cn("flex justify-between bg-muted/50 p-4 border-t")}>
                  <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                      <ArrowLeft className="mr-2 h-4 w-4" />Back
                  </Button>
                  <Button onClick={handleNext}>
                      {step === 3 ? 'Finish & Build' : 'Next'}<ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
              </CardFooter>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen font-body text-foreground bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
                 <span className="sr-only sm:not-sr-only sm:ml-2">Logout</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsAuthDialogOpen(true)} title="Login / Sign Up" variant="default" className="ml-4">
                <LogIn className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Login / Sign Up</span>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" onClick={() => setStep(1)} title="New Puzzle">
            <FilePlus className="h-4 w-4" />
             <span className="sr-only sm:not-sr-only sm:ml-2">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={crossword.savePuzzle} title="Save Puzzle">
            <Save className="h-4 w-4" />
             <span className="sr-only sm:not-sr-only sm:ml-2">Save</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => crossword.loadPuzzle(() => setStep(4))} title="Load Puzzle">
            <FolderOpen className="h-4 w-4" />
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

      {renderStepContent()}
      
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </div>
  )
}
