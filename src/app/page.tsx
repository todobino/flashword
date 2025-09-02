'use client';

import { useState } from 'react';
import { CrosswordBuilder } from "@/components/crossword-builder";
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import type { Puzzle, Grid } from '@/lib/types';

export default function Home() {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);

  const handlePuzzleCreate = (puzzleData: Puzzle) => {
    setPuzzle(puzzleData);
  };

  const handleExitWizard = () => {
    // For now, we'll just keep them in the wizard if no puzzle is created.
  }

  if (!puzzle) {
    return <NewPuzzleWizard onPuzzleCreate={handlePuzzleCreate} onExit={handleExitWizard} />;
  }

  return (
    <main>
      <CrosswordBuilder initialPuzzle={puzzle} />
    </main>
  );
}
