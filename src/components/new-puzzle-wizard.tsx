
'use client';

import { useState, useMemo, useEffect, Fragment } from 'react';
import { getAuth, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { ArrowLeft, ArrowRight, FolderOpen, LogIn, LogOut, FilePlus, RotateCw, Sparkles, LoaderCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogoIcon } from '@/components/icons';
import { useCrossword } from '@/hooks/use-crossword';
import { CrosswordGrid } from './crossword-grid';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AuthDialog } from './auth-dialog';
import { app, db } from '@/lib/firebase';
import type { Puzzle, TemplateName } from '@/lib/types';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { generateThemeAction } from '@/app/actions';
import { Textarea } from './ui/textarea';


interface NewPuzzleWizardProps {
  onStartBuilder: (puzzle: Puzzle) => void;
  onLoad: (puzzle: Puzzle) => void;
}

const SIZES = [
    { size: 15, label: 'NYT Standard' },
    { size: 21, label: 'NYT Sunday' },
    { size: 5, label: 'NYT Mini' },
    { size: 7, label: 'NYT Mini Saturday' },
];


const TEMPLATES: { name: TemplateName, description: string }[] = [
    { name: 'Classic', description: 'A standard, widely-used symmetric pattern.'},
    { name: 'Blocked', description: 'Higher density of black squares, easier to fill.'},
    { name: 'Wide Open', description: 'Very few black squares, for a challenging construction.' },
];


const SizeTile = ({ s, label, isSelected, onSelect }: { s: number, label: string, isSelected: boolean, onSelect: (size: number) => void}) => {
  return (
    <div
      onClick={() => onSelect(s)}
      className={cn(
        'border-2 rounded-lg p-4 flex flex-col items-center justify-center gap-4 cursor-pointer transition-colors',
        isSelected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
      )}
    >
      <div className="grid grid-cols-4 gap-0.5 w-12 h-12 bg-muted-foreground/20 shrink-0">
        {Array(16).fill(0).map((_, i) => <div key={i} className="bg-background" />)}
      </div>
      <div className="flex flex-col text-center">
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
  { step: 4, title: 'Review & Confirm' },
];


export function NewPuzzleWizard({ onStartBuilder, onLoad }: NewPuzzleWizardProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState(15);
  const [title, setTitle] = useState('');
  const [themeDescription, setThemeDescription] = useState('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState(false);
  
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
        if (size !== crossword.size) {
            crossword.resetGrid(size);
        }
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

  const handleRandomize = (templateName: TemplateName) => {
    crossword.randomizeGrid(templateName);
  }
  
  const themers = useMemo(() => {
    if (step !== 3 && step !== 4) return [];
    const allClues = [...crossword.clues.across, ...crossword.clues.down];
    allClues.sort((a,b) => b.length - a.length);
    const longest = allClues.length > 0 ? allClues[0].length : 0;
    return allClues.filter(c => c.length >= Math.max(7, longest - 2));
  }, [crossword.clues, step]);

  const handleGenerateTheme = async () => {
    setIsGeneratingTheme(true);
    toast({ title: 'Generating Theme...', description: 'AI is crafting a title and theme answers for you.' });
    
    const themeAnswerSlots = themers.map(clue => ({
        number: clue.number,
        direction: clue.direction,
        length: clue.length,
    }));

    const result = await generateThemeAction({ description: themeDescription, answers: themeAnswerSlots });
    
    if (result.success && result.data) {
        crossword.setTitle(result.data.title);
        result.data.themeAnswers.forEach(answer => {
            const clueToFill = themers.find(t => t.number === answer.number && t.direction === answer.direction);
            if (clueToFill) {
                crossword.fillWord(clueToFill, answer.word);
            }
        });
        toast({ title: 'Theme Generated!', description: `"${result.data.title}" and theme answers have been populated.` });
    } else {
        toast({ variant: 'destructive', title: 'Theme Generation Failed', description: result.error });
    }
    
    setIsGeneratingTheme(false);
  };
  
  const gridAnalysis = useMemo(() => {
    const totalSquares = crossword.size * crossword.size;
    const blackSquares = crossword.grid.flat().filter(cell => cell.isBlack).length;
    const totalWords = crossword.clues.across.length + crossword.clues.down.length;
    const allClues = [...crossword.clues.across, ...crossword.clues.down];
    const totalWordLetters = allClues.reduce((sum, clue) => sum + clue.length, 0);
    const totalLongWords = allClues.filter(c => c.length >= 8).length;

    const blackSquarePercentage = totalSquares > 0 ? (blackSquares / totalSquares) : 0;
    const averageWordLength = totalWords > 0 ? totalWordLetters / totalWords : 0;

    let difficulty = 'Medium';
    if (averageWordLength > 5.5 && blackSquarePercentage < 0.17) {
        difficulty = 'Hard';
    } else if (averageWordLength > 5.0 && blackSquarePercentage < 0.20) {
        difficulty = 'Challenging';
    } else if (averageWordLength < 4.5 || blackSquarePercentage > 0.25) {
        difficulty = 'Easy';
    }

    return {
      blackSquarePercentage: blackSquarePercentage * 100,
      totalWords: totalWords,
      totalLongWords: totalLongWords,
      difficulty: difficulty,
    };
  }, [crossword.grid, crossword.clues, crossword.size]);


  const CurrentStepDescription = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <p>Welcome to the FlashWord puzzle builder! This wizard will guide you through the initial setup of your crossword. Here's what to expect:</p>
            <ul className="space-y-2 list-disc list-inside">
                <li><b>Step 1: Choose Grid Size.</b> Select a standard or custom size for your puzzle.</li>
                <li><b>Step 2: Design Pattern.</b> Create the layout of black and white squares for your grid.</li>
                <li><b>Step 3: Choose Puzzle Theme.</b> Set a title and generate AI-powered theme answers.</li>
                 <li><b>Step 4: Review & Confirm.</b> Once the setup is complete, you'll move to the main builder to write clues and fill in the answers.</li>
            </ul>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <p>Click and drag to make squares black. Or, select a template to generate a pattern! The best patterns follow these rules:</p>
            <ul className="space-y-2 list-disc list-inside">
               <li><b>Connectivity:</b> All white squares must be connected (no isolated sections).</li>
               <li><b>Word Lengths:</b> Minimum 3 letters per word (no 2-letter entries).</li>
               <li><b>Balance:</b> Roughly equal Across and Down entries.</li>
               <li><b>Black Squares:</b> Usually around 20% of the total grid; should not split the puzzle into disjoint regions.</li>
               <li><b>Difficulty & Theming:</b> Fewer black squares and longer words generally make a puzzle harder. The longest words are often used for the theme, which you can set on the next step.</li>
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
              <li><b>Smart Theme:</b> Use the AI-powered "Smart Theme" tool to get a head start. Provide a simple description, and it will generate a creative title and theme answers that fit your grid's constraints.</li>
            </ul>
          </div>
        );
       case 4:
        return (
          <p>
            You're almost there! Please review your puzzle's configuration below. If everything looks correct,
            click "Start Building" to proceed to the main editor where you can write clues and finalize your puzzle.
            You can still go back to previous steps to make changes.
          </p>
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
      <main className="flex-1 bg-background py-6 lg:py-8 px-2 sm:px-3">
        <div className="w-full max-w-[min(95vw,1600px)] mx-auto grid gap-8 md:grid-cols-5">
          {/* Left Column */}
          <div className="flex flex-col justify-start space-y-6 md:col-span-2">
            
            {/* Stepper */}
            <ol className="flex w-full items-center">
              {WIZARD_STEPS.map((s, i) => (
                <Fragment key={s.step}>
                  {/* circle */}
                  <li className="shrink-0">
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2",
                        step >= s.step
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {s.step}
                    </span>
                  </li>

                  {/* connector between circles */}
                  {i < WIZARD_STEPS.length - 1 && (
                    <li
                      className={cn(
                        "mx-3 h-0.5 flex-1 rounded-full bg-border",
                        step > s.step && "bg-primary"
                      )}
                      aria-hidden
                    />
                  )}
                </Fragment>
              ))}
            </ol>
            
            <div className="flex justify-between items-center">
                <div>
                    <p className="text-sm text-muted-foreground">Step {step} of {WIZARD_STEPS.length}</p>
                    <h3 className="text-xl font-semibold mt-1">{WIZARD_STEPS[step - 1].title}</h3>
                </div>
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

            <div className="text-sm text-muted-foreground mt-4">
                <CurrentStepDescription />
            </div>

          </div>

          {/* Right Column */}
          <Card className="overflow-hidden shadow-lg w-full self-start md:col-span-3">
              <CardContent className="p-4 sm:p-5">
              {step === 1 && (
                  <div className="flex flex-col gap-6 w-full">
                      <div>
                        <Label className="text-base font-semibold">Standard Sizes</Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            {SIZES.map(s => (
                              <SizeTile key={s.size} s={s.size} label={s.label} isSelected={size === s.size} onSelect={handleSizeSelect} />
                            ))}
                        </div>
                      </div>
                      <Separator />
                      <div>
                        <Label className="text-base font-semibold">Custom Size</Label>
                        <div className="flex items-center gap-4 mt-4">
                          <Slider
                            value={[size]}
                            onValueChange={(value) => handleSizeSelect(value[0])}
                            min={5}
                            max={25}
                            step={1}
                            className="flex-1"
                          />
                          <div className="font-mono text-lg font-semibold w-24 text-center border rounded-md p-2">
                            {size} x {size}
                          </div>
                        </div>
                      </div>
                  </div>
              )}
              {step === 2 && (
                <div className="grid gap-6 md:grid-cols-[16rem_minmax(340px,1fr)] h-full">
                  {/* LEFT: CONTROLS */}
                  <div className="flex flex-col gap-4 w-64">
                    <div className="space-y-2">
                      <Label>Randomizers</Label>
                      <ScrollArea className="border rounded-md flex-1">
                        <div className="p-2 space-y-1">
                          {TEMPLATES.map(template => (
                            <div
                              key={template.name}
                              className="p-2 rounded-md hover:bg-muted cursor-pointer"
                              onClick={() => handleRandomize(template.name)}
                            >
                              <h4 className="font-semibold">{template.name}</h4>
                              <p className="text-xs text-muted-foreground">{template.description}</p>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    <div className="space-y-2">
                      <Label>Analysis</Label>
                      <div className="text-sm text-muted-foreground border rounded-md p-3 space-y-2">
                        <div className="flex justify-between"><span>Total Words:</span> <span className="font-medium text-foreground">{gridAnalysis.totalWords}</span></div>
                        <div className="flex justify-between"><span>Total Long Words:</span> <span className="font-medium text-foreground">{gridAnalysis.totalLongWords}</span></div>
                        <div className="flex justify-between"><span>Black Square %:</span> <span className="font-medium text-foreground">{gridAnalysis.blackSquarePercentage.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Difficulty:</span> <span className="font-medium text-foreground">{gridAnalysis.difficulty}</span></div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-auto">
                        <Button variant="outline" onClick={handleReset}><RotateCw className="mr-2 h-4 w-4" /> Reset</Button>
                    </div>
                  </div>

                  {/* RIGHT: GRID */}
                  <div className="w-full min-w-[340px] shrink-0">
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
                </div>
              )}
              {step === 3 && (
                   <div className="grid md:grid-cols-2 gap-8 w-full">
                      <div className="space-y-6">
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
                            {themers.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">No theme-length answers found in this grid.</p>}
                            </div>
                         </div>
                      </div>
                       <div className="space-y-4 rounded-lg border bg-background p-4">
                           <Label className="font-semibold text-base">Smart Theme</Label>
                           <Textarea
                               placeholder="Describe your theme idea. e.g., 'Things that can be found in a park' or 'Puns about vegetables'."
                               value={themeDescription}
                               onChange={(e) => setThemeDescription(e.target.value)}
                               rows={5}
                            />
                            <Button onClick={handleGenerateTheme} disabled={isGeneratingTheme || !themeDescription || themers.length === 0} className="w-full">
                                {isGeneratingTheme ? <LoaderCircle className="animate-spin" /> : <Sparkles />}
                                <span>Generate</span>
                            </Button>
                       </div>
                   </div>
              )}
               {step === 4 && (
                <div className="grid gap-8 md:grid-cols-2">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-base font-semibold">Summary</Label>
                      <div className="space-y-3 rounded-md border p-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Title:</span>
                          <span className="font-semibold">{crossword.title || 'Untitled'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Size:</span>
                          <span className="font-semibold">{crossword.size} x {crossword.size}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total Words:</span>
                          <span className="font-semibold">{gridAnalysis.totalWords}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Theme Answers:</span>
                          <span className="font-semibold">{themers.length}</span>
                        </div>
                      </div>
                    </div>
                     <div className="space-y-2">
                        <Label className="text-base font-semibold">Theme Answers</Label>
                         <div className="space-y-2">
                            {themers.map(clue => (
                                <div key={`${clue.number}-${clue.direction}`} className="flex items-center gap-4 rounded-md border p-2 bg-muted/30">
                                    <span className="font-mono text-sm text-muted-foreground w-24">{clue.number} {clue.direction} ({clue.length})</span>
                                    <span className="font-mono uppercase tracking-widest text-sm font-medium">{crossword.getWordFromGrid(clue).replace(/_/g, ' ')}</span>
                                </div>
                            ))}
                            {themers.length === 0 && <p className="text-sm text-muted-foreground text-center p-4">No theme answers provided.</p>}
                        </div>
                    </div>
                  </div>
                  <div>
                     <Label className="text-base font-semibold">Final Grid</Label>
                     <div className="mt-2">
                        <CrosswordGrid
                          grid={crossword.grid}
                          size={size}
                          onCellClick={() => {}}
                          onCharChange={() => {}}
                          selectedClue={null}
                          currentClueDetails={null}
                          onSelectClue={() => {}}
                          designMode={true} // Read-only view
                        />
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
