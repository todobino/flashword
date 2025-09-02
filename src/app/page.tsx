'use client';

import { useState } from 'react';
import { CrosswordBuilder } from "@/components/crossword-builder";
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import type { Grid } from '@/lib/types';

export default function Home() {
  const [puzzle, setPuzzle] = useState<{size: number, grid: Grid} | null>(null);

  const handlePuzzleCreate = (size: number, grid: Grid) => {
    setPuzzle({ size, grid });
  };

  const handleExitWizard = () => {
    // If a puzzle has been created, we don't want to go back to an empty state
    // but if the user just refreshed and there's no puzzle, we can let them exit.
    // For now, we'll just keep them in the wizard if no puzzle is created.
    // A more advanced implementation might load a default/saved puzzle.
  }

  if (!puzzle) {
    return <NewPuzzleWizard onPuzzleCreate={handlePuzzleCreate} onExit={handleExitWizard} />;
  }

  return (
    <main>
      <CrosswordBuilder initialSize={puzzle.size} initialGrid={puzzle.grid} />
    </main>
  );
}
