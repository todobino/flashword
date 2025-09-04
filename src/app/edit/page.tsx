
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CrosswordBuilder } from '@/components/crossword-builder';
import type { Puzzle } from '@/lib/types';
import { useCrosswordStore } from '@/store/crossword-store';
import { LogoIcon } from '@/components/icons';
import { FilePlus } from 'lucide-react';

export default function EditPage() {
  const { puzzle, setPuzzle, clearPuzzle } = useCrosswordStore();
  const router = useRouter();

  useEffect(() => {
    // If there's no puzzle in the store, the user probably landed here directly.
    // Redirect them to the start of the flow.
    if (!puzzle) {
        router.push('/');
    }
  }, [puzzle, router]);

  const handleLoad = (puzzle: Puzzle) => {
    setPuzzle(puzzle);
  }

  const handleNew = () => {
    clearPuzzle();
    router.push('/new');
  }

  // While redirecting or if puzzle is null before the effect runs
  if (!puzzle) {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-background">
            <p>Loading...</p>
        </div>
    );
  }

  return <CrosswordBuilder puzzle={puzzle} onNew={handleNew} onLoad={handleLoad} />;

}
