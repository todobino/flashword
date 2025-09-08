
'use client';

import { useState, useMemo, useEffect } from 'react';
import { createGrid } from '@/hooks/use-crossword';
import { CrosswordGridPlay } from '@/components/crossword-grid-play';
import { Timer } from '@/components/timer';
import { Button } from '@/components/ui/button';
import type { PlayablePuzzle, Grid, Entry } from '@/lib/types';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClueListPlay } from './clue-list-play';

interface CrosswordPlayerProps {
  puzzle: PlayablePuzzle;
}

export function CrosswordPlayer({ puzzle }: CrosswordPlayerProps) {
  const { toast } = useToast();
  
  const initialGrid = useMemo(() => {
    const newGrid = createGrid(puzzle.size);
    (puzzle.grid as string[]).forEach((rowStr, r) => {
      for (let c = 0; c < puzzle.size; c++) {
        const char = rowStr[c] || '.';
        if (char === '#') {
          newGrid[r][c].isBlack = true;
        }
      }
    });
    // Add numbers to grid based on entries
    puzzle.entries.forEach(entry => {
        newGrid[entry.row][entry.col].number = entry.number;
    });
    return newGrid;
  }, [puzzle]);

  const clues = useMemo(() => {
    const across = puzzle.entries.filter((e) => e.direction === 'across').sort((a,b) => a.number - b.number);
    const down = puzzle.entries.filter((e) => e.direction === 'down').sort((a,b) => a.number - b.number);
    return { across, down };
  }, [puzzle.entries]);


  const [grid, setGrid] = useState<Grid>(initialGrid);
  const [selectedClue, setSelectedClue] = useState<Entry | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'paused' | 'finished'>('idle');
  const [isPaused, setIsPaused] = useState(true);

  const handleStart = () => {
    setGameState('playing');
    setIsPaused(false);
    // Auto-select the first clue
    if (clues.across.length > 0) {
      setSelectedClue(clues.across[0]);
    } else if (clues.down.length > 0) {
      setSelectedClue(clues.down[0]);
    }
  };

  const handlePause = () => {
    setGameState('paused');
    setIsPaused(true);
  };

  const handleResume = () => {
    setGameState('playing');
    setIsPaused(false);
  };
  
  const updateCellChar = (row: number, col: number, char: string) => {
    if (grid[row][col].isBlack) return;
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[row][col].char = char.toUpperCase();
    setGrid(newGrid);

    // Check for win condition
    const isFinished = newGrid.flat().every((cell: any) => {
        if(cell.isBlack) return true;
        const answerCell = puzzle.entries.find(e => e.row === cell.row && e.col === cell.col);
        // This is complex, will need to be improved.
        return true; 
    });

    if(isFinished) {
        setGameState('finished');
        toast({ title: 'Congratulations!', description: 'You have solved the puzzle!'});
    }
  };
  
  const currentClueDetails = useMemo(() => {
    if (!selectedClue) return null;
    return puzzle.entries.find(c => c.number === selectedClue.number && c.direction === selectedClue.direction) || null;
  }, [selectedClue, puzzle.entries]);

  return (
    <>
       <header className="sticky top-16 z-10 flex shrink-0 items-center justify-between border-b bg-card p-2 px-4">
            <div className="flex items-baseline gap-3">
                <h1 className="text-lg font-bold">{puzzle.title}</h1>
                <p className="text-sm text-muted-foreground">by {puzzle.author}</p>
            </div>
            <div className="flex items-center gap-3">
                <Timer isPaused={isPaused} />
            {gameState === 'idle' && (
                <Button onClick={handleStart} size="sm"><Play className="mr-2 h-4 w-4" /> Start</Button>
            )}
            {gameState === 'playing' && (
                <Button onClick={handlePause} variant="outline" size="sm"><Pause className="mr-2 h-4 w-4" /> Pause</Button>
            )}
            {gameState === 'paused' && (
                <Button onClick={handleResume} size="sm"><Play className="mr-2 h-4 w-4" /> Resume</Button>
            )}
            </div>
      </header>
       <main className="flex-1 grid md:grid-cols-3 gap-4 p-4 overflow-hidden">
        {gameState !== 'idle' ? (
           <>
            <div className="md:col-span-1 h-full overflow-hidden">
                <ClueListPlay
                    clues={clues}
                    selectedClue={selectedClue}
                    onSelectClue={setSelectedClue}
                />
            </div>
            <div className="md:col-span-2 flex items-center justify-center">
                <CrosswordGridPlay
                    grid={grid}
                    size={puzzle.size}
                    onCharChange={updateCellChar}
                    selectedClue={selectedClue}
                    currentClueDetails={currentClueDetails}
                    onSelectClue={setSelectedClue}
                    clues={clues}
                />
            </div>
           </>
        ) : (
            <div className="md:col-span-3 flex flex-col items-center justify-center bg-muted/50 rounded-lg p-8">
                 <h2 className="text-2xl font-bold">Ready to Play?</h2>
                 <p className="text-muted-foreground mt-2">Click the start button to reveal the clues and begin the timer.</p>
                 <Button onClick={handleStart} size="lg" className="mt-6"><Play className="mr-2 h-5 w-5" /> Start Puzzle</Button>
            </div>
        )}
      </main>
    </>
  );
}
