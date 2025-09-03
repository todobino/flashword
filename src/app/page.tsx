'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CrosswordBuilder } from '@/components/crossword-builder';
import type { Puzzle } from '@/lib/types';
import { useCrosswordStore } from '@/store/crossword-store';
import { LogoIcon } from '@/components/icons';
import { FilePlus } from 'lucide-react';

export default function Home() {
  const { puzzle, setPuzzle, clearPuzzle } = useCrosswordStore();

  const handleLoad = (puzzle: Puzzle) => {
    setPuzzle(puzzle);
  }

  if (puzzle) {
    return <CrosswordBuilder puzzle={puzzle} onNew={clearPuzzle} onLoad={handleLoad} />;
  }

  return (
    <main className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-card shadow-lg border">
            <div className="flex items-center gap-3">
                <LogoIcon className="h-12 w-12 text-primary" />
                <h1 className="text-4xl font-bold tracking-tight text-primary">FlashWord</h1>
            </div>
            <p className="text-lg text-muted-foreground">Your AI-powered crossword companion.</p>
            <div className="flex gap-4 mt-4">
                <Button asChild size="lg">
                    <Link href="/new">
                        <FilePlus />
                        New Puzzle
                    </Link>
                </Button>
            </div>
        </div>
    </main>
  );
}
