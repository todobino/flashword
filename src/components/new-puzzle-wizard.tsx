
'use client';

import { useState, useMemo, useEffect } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { ArrowLeft, ArrowRight, FolderOpen, LogIn, LogOut, FilePlus, RotateCw, Shuffle, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/icons';
import { useCrossword } from '@/hooks/use-crossword';
import { CrosswordGrid } from './crossword-grid';
import { cn } from '@/lib/utils';
import { ClueLists } from './clue-lists';
import { useToast } from '@/hooks/use-toast';
import { AuthDialog } from './auth-dialog';
import { app, db } from '@/lib/firebase';
import type { Puzzle } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';


interface NewPuzzleWizardProps {
  onStartBuilder: (puzzle: Puzzle) => void;
  onLoad: (puzzle: Puzzle) => void;
}

const SIZES = [
    { size: 15, label: 'NYT Standard' },
    { size: 17, label: 'Common Variant' },
    { size: 19, label: 'Common Variant' },
    { size: 21, label: 'NYT Sunday' }
];

const TEMPLATES = [
    { name: 'Classic', description: 'A standard, widely-used symmetric pattern.'},
    { name: 'Freestyle', description: 'More open, with fewer black squares.'},
    { name: 'Blocked', description: 'Higher density of black squares, easier to fill.'},
    { name: 'Wide Open', description: 'Very few black squares, for a challenging construction.' },
];


const SizeTile = ({ s, label, isSelected, onSelect }: { s: number, label: string, isSelected: boolean, onSelect: (size: number) => void}) => {
  return (
    <div
      onClick={() => onSelect(s)}
      className={cn(
        'border-2 rounded-lg p-4 flex flex-row items-center justify-start gap-4 cursor-pointer transition-colors',
        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="grid grid-cols-4 gap-0.5 w-12 h-12 bg-muted-foreground/20 shrink-0">
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
  { step: 1, title: 'Choose Grid Size' },
  { step: 2, title: 'Design Pattern' },
  { step: 3, title: 'Choose Puzzle Theme' },
];


export function NewPuzzleWizard({ onStartBuilder, onLoad }: NewPuzzleWizardProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState(15);
  const [title, setTitle] = useState('');
  
  const [user, setUser] = useState<User | null>(null);
  const crossword = useCrossword(size, undefined, undefined, title, undefined, user);

  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (!user) return;
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          email: user.email,
          displayName: user.displayName ?? null,
          photoURL: user.photoURL ?? null,
          puzzleIds: [],
          createdAt: serverTimestamp(),
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleNext = () => {
    if (step === 1) { // Move from Size to Design
      crossword.resetGrid(size);
    }
    if (step < WIZARD_STEPS.length) {
      setStep(s => s + 1);
    } else { // Finish
      onStartBuilder({
          id: undefined,
          title: crossword.title,
          size: crossword.size,
          grid: crossword.grid,
          clues: crossword.clues,
      })
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
            <p>Click and drag to make squares black. Or, select a template or randomize it! The best patterns follow these rules:</p>
            <ul className="space-y-2 list-disc list-inside">
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
            <ul className="space-y-2 list-disc list-inside">
              <li><b>Themers:</b> These are the longest entries, often symmetrical, that share a common idea.</li>
              <li><b>The "Revealer":</b> Often, one of the theme answers explains the gimmick. A solver might not get it at first, but it provides an "aha!" moment that helps solve the other themers.</li>
              <li><b>Wordplay:</b> Themes often rely on puns, shared categories, or other clever wordplay. For example, a theme like "SUPER VEGGIES" might have answers where vegetables are part of superhero names.</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  }

  const handleLogout = async () => {
    const auth = getAuth(app);
    await signOut(auth);
    toast({ title: 'Logged out successfully.' });
  };
  
  const handleLoadPuzzle = async () => {
    if (!user) {
        toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to load a puzzle." });
        return;
    }
    const loadedPuzzle = await crossword.loadPuzzle();
    if (loadedPuzzle) {
        onLoad(loadedPuzzle);
    }
  }


  const renderStepContent = () => {
    return (
      <main className="flex-1 bg-background py-10 lg:py-14 px-2 sm:px-3">
        <div className="w-full max-w-[min(95vw,1600px)] mx-auto grid gap-8 md:grid-cols-3">
          {/* Left Column */}
          <div className="flex flex-col justify-start space-y-6 md:col-span-1">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold tracking-tight">Create Crossword</h2>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={handleBack} disabled={step === 1}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button onClick={handleNext}>
                    <span>{step === WIZARD_STEPS.length ? 'Start Building' : 'Next'}</span>
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Stepper */}
            <ol className="flex items-center w-full">
              {WIZARD_STEPS.map((s, index) => (
                <li key={s.step} className={cn("flex w-full items-center", { "text-primary": step >= s.step }, { "after:content-[''] after:w-full after:h-1 after:border-b after:border-4 after:inline-block": index < WIZARD_STEPS.length - 1 }, { 'after:border-primary': step > s.step }, { 'after:border-border': step <= s.step })}>
                  <span className={cn("flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-2", step >= s.step ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border")}>
                    {s.step}
                  </span>
                </li>
              ))}
            </ol>
            
            <div>
              <p className="text-sm text-muted-foreground">Step {step} of {WIZARD_STEPS.length}</p>
              <h3 className="text-xl font-semibold mt-1">{WIZARD_STEPS[step - 1].title}</h3>
              <div className="text-sm text-muted-foreground mt-4">
                <CurrentStepDescription />
              </div>
            </div>

          </div>

          {/* Right Column */}
          <Card className="overflow-hidden shadow-lg w-full self-start md:col-span-2">
              <CardContent className="p-6">
              {step === 1 && (
                  <div className="flex flex-col gap-4 items-center w-full">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full p-4">
                          {SIZES.map(s => (
                          <SizeTile key={s.size} s={s.size} label={s.label} isSelected={size === s.size} onSelect={handleSizeSelect} />
                          ))}
                      </div>
                  </div>
              )}
              {step === 2 && (
                   <div className="grid grid-cols-3 gap-6 h-full">
                     <div className="col-span-2">
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
                      <div className="col-span-1 flex flex-col gap-4">
                          <div className="space-y-2">
                            <Label>Actions</Label>
                             <div className="flex flex-col gap-2">
                               <Button variant="outline" onClick={handleReset}><RotateCw className="mr-2 h-4 w-4" /> Reset</Button>
                               <Button variant="outline" onClick={handleRandomize}><Shuffle className="mr-2 h-4 w-4" /> Randomize</Button>
                             </div>
                          </div>
                         <div className="space-y-2 flex-1 flex flex-col min-h-0">
                            <Label>Templates</Label>
                            <ScrollArea className="border rounded-md flex-1">
                                <div className="p-2 space-y-1">
                                    {TEMPLATES.map(template => (
                                        <div key={template.name} className="p-2 rounded-md hover:bg-muted cursor-pointer" onClick={handleRandomize}>
                                            <h4 className="font-semibold">{template.name}</h4>
                                            <p className="text-xs text-muted-foreground">{template.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                         </div>
                          <Button variant="outline" disabled><Save className="mr-2 h-4 w-4" /> Save Template</Button>
                      </div>
                   </div>
                 )}
              {step === 3 && (
                   <div className="space-y-6 w-full">
                      <div className="space-y-2">
                          <Label htmlFor="puzzle-title">Puzzle Title</Label>
                          <Input id="puzzle-title" placeholder="e.g., Sunday Special" value={crossword.title} onChange={(e) => crossword.setTitle(e.target.value)} />
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
          </Card>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen font-body text-foreground bg-background">
      <header className="flex items-center justify-between p-4 border-b shrink-0 sticky top-0 z-10 bg-card">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setStep(1)} title="New Puzzle">
            <FilePlus className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">New</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleLoadPuzzle} disabled={!user} title="Load Puzzle">
            <FolderOpen className="h-4 w-4" />
            <span className="sr-only sm:not-sr-only sm:ml-2">Load</span>
          </Button>
           {user ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">{user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
                 <span className="sr-only sm:not-sr-only sm:ml-2">Logout</span>
              </Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setIsAuthDialogOpen(true)} title="Login" variant="default">
                <LogIn className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only sm:ml-2">Login</span>
            </Button>
          )}
        </div>
      </header>

      {renderStepContent()}
      
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </div>
  )
}

    
