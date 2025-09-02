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
    // For now, we'll just keep them in the wizard if no puzzle is created.
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
