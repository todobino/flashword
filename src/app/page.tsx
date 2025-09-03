'use client';

import { useState } from 'react';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import { CrosswordBuilder } from '@/components/crossword-builder';
import type { Puzzle } from '@/lib/types';
import { createGrid } from '@/hooks/use-crossword';

export default function Home() {
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);

  const handleStartBuilder = (puzzle: Puzzle) => {
    setCurrentPuzzle(puzzle);
  };
  
  const handleNew = () => {
    setCurrentPuzzle(null);
  }
  
  const handleLoad = (puzzle: Puzzle) => {
    setCurrentPuzzle(puzzle);
  }

  if (currentPuzzle) {
    return <CrosswordBuilder puzzle={currentPuzzle} onNew={handleNew} onLoad={handleLoad} />;
  }

  return (
    <main>
      <NewPuzzleWizard onStartBuilder={handleStartBuilder} onLoad={handleLoad} />
    </main>
  );
}
