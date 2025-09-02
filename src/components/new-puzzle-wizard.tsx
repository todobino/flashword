'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, RotateCw, Shuffle } from 'lucide-react';
import { LogoIcon } from '@/components/icons';
import { useCrossword } from '@/hooks/use-crossword';
import type { Grid } from '@/lib/types';
import { CrosswordGrid } from './crossword-grid';
import { cn } from '@/lib/utils';

interface NewPuzzleWizardProps {
  onPuzzleCreate: (size: number, grid: Grid) => void;
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

export function NewPuzzleWizard({ onPuzzleCreate, onExit }: NewPuzzleWizardProps) {
  const [step, setStep] = useState(1);
  const [size, setSize] = useState(15);
  const crossword = useCrossword(size);

  const handleSizeNext = () => {
    crossword.resetGrid(size);
    setStep(2);
  };
  
  const handleCreatePuzzle = () => {
    onPuzzleCreate(size, crossword.grid);
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

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background p-4">
       <div className="absolute top-4 left-4 flex items-center gap-3">
          <LogoIcon className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-primary">FlossWord</h1>
        </div>
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Create a New Crossword</CardTitle>
          <CardDescription>
            Step {step} of 2: {step === 1 ? 'Choose your grid size.' : 'Design your grid pattern.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="flex flex-col gap-4 items-center">
               <p className="text-center text-muted-foreground">How large do you want your puzzle to be?</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full p-4">
                {SIZES.map(s => (
                  <SizeTile key={s.size} s={s.size} label={s.label} isSelected={size === s.size} onSelect={handleSizeSelect} />
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
             <div className="space-y-4 flex flex-col items-center">
             <p className="text-center text-muted-foreground">
               Click on squares to toggle them black, or generate a random layout. The grid will maintain rotational symmetry.
             </p>
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
        </CardContent>
        <CardFooter className="flex justify-between">
          {step === 1 && <Button variant="ghost" onClick={onExit} disabled>Cancel</Button>}
          {step === 2 && <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>}
          {step === 1 && <Button onClick={handleSizeNext}>Next<ArrowRight className="ml-2 h-4 w-4" /></Button>}
          {step === 2 && <Button onClick={handleCreatePuzzle}>Create Puzzle</Button>}
        </CardFooter>
      </Card>
    </div>
  );
}
