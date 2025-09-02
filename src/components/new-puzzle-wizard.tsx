'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle, Wand2 } from 'lucide-react';
import { LogoIcon } from '@/components/icons';
import { useCrossword } from '@/hooks/use-crossword';
import type { Puzzle, Clue } from '@/lib/types';
import { CrosswordGrid } from './crossword-grid';
import { cn } from '@/lib/utils';
import { ClueLists } from './clue-lists';

interface NewPuzzleWizardProps {
  onPuzzleCreate: (puzzle: Puzzle) => void;
  onExit: () => void;
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
  { step: 4, title: 'Fill in the blanks.' }
];


export function NewPuzzleWizard({ onPuzzleCreate, onExit }: NewPuzzleWizardProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState(15);
  const [title, setTitle] = useState('');
  const crossword = useCrossword(size);

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
  
  const handleCreatePuzzle = () => {
    onPuzzleCreate({
      size: crossword.size,
      grid: crossword.grid,
      clues: crossword.clues,
      title,
    });
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
    const allClues = [...crossword.clues.across, ...crossword.clues.down];
    allClues.sort((a,b) => b.length - a.length);
    const longest = allClues.length > 0 ? allClues[0].length : 0;
    return allClues.filter(c => c.length >= Math.max(7, longest - 2));
  }, [crossword.clues]);

  const CurrentStepDescription = () => {
    switch (step) {
      case 1:
        return <p>Select a standard crossword size. Larger puzzles are more challenging to create and solve.</p>;
      case 2:
        return (
          <div className="space-y-4">
            <p>Click and drag to make squares black. Or, just randomize it! The best patterns follow these rules:</p>
            <ul className="space-y-2 list-disc list-inside text-xs">
              <li><b>Connectivity:</b> All white squares must be connected.</li>
              <li><b>Word Lengths:</b> Words must be at least 3 letters long.</li>
              <li><b>Black Squares:</b> Aim for about 16% of the grid to be black squares.</li>
              <li><b>Symmetry:</b> The grid must have 180-degree rotational symmetry (this is handled for you automatically).</li>
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
        return <p>Your puzzle is ready! Fill in the remaining answers and clues, then use the AI tools to help you finish.</p>
      default:
        return null;
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
       <div className="absolute top-4 left-4 flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
        </div>
      <div className={cn("w-full max-w-7xl grid gap-8", step < 4 ? "md:grid-cols-2" : "grid-cols-1" )}>
        {step < 4 && (
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
        )}
        <Card className="overflow-hidden">
            <CardContent className={cn("p-6", step === 4 && 'hidden')}>
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
                                    className="font-mono uppercase tracking-widest"
                                />
                            </div>
                        ))}
                        </div>
                     </div>
                 </div>
            )}
            </CardContent>
            {step === 4 && (
                 <div className="p-6 text-center">
                    <CardTitle>Ready to Go!</CardTitle>
                    <CardDescription className="mt-2 mb-4">Your puzzle grid and theme are set.</CardDescription>
                    <Button onClick={handleCreatePuzzle} size="lg">Start Filling &rarr;</Button>
                 </div>
            )}
            <CardFooter className={cn("flex justify-between bg-muted/50 p-4 border-t", step === 4 && 'hidden')}>
                <Button variant="outline" onClick={handleBack} disabled={step === 1}>
                    <ArrowLeft className="mr-2 h-4 w-4" />Back
                </Button>
                <Button onClick={handleNext}>
                    Next<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
