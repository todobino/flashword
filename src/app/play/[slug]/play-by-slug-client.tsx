
'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CrosswordPlayer } from '@/components/crossword-player';
import type { PlayablePuzzle, PuzzleDoc } from '@/lib/types';
import { LoaderCircle } from 'lucide-react';
import { AppHeader } from '@/components/app-header';

export default function PlayBySlug({ slug }: { slug: string }) {
  const [puzzle, setPuzzle] = useState<PlayablePuzzle | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const slugSnap = await getDoc(doc(db, 'slugs', slug));
        if (!slugSnap.exists()) { setErr('not-found'); return; }
        const { puzzleId } = slugSnap.data() as { puzzleId: string };

        const pubSnap = await getDoc(doc(db, 'puzzles', puzzleId));
        if (!pubSnap.exists()) { setErr('not-found'); return; }
        const data = pubSnap.data() as PuzzleDoc;
        if (data.status !== 'published') { setErr('not-found'); return; }

        const playable: PlayablePuzzle = {
          id: pubSnap.id,
          title: data.title,
          author: data.author,
          size: data.size,
          grid: data.grid,
          entries: data.entries,
          createdAt: data.createdAt.toDate(),
          puzzleType: data.puzzleType || 'crossword',
        };
        if (!cancelled) setPuzzle(playable);
      } catch {
        if (!cancelled) setErr('load');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (isLoading) {
       return (
           <div className="flex flex-col items-center justify-center h-screen bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading puzzle...</p>
            </div>
      );
  }

  if (err === 'not-found') {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-background">
            <h2 className="text-2xl font-bold">Puzzle Not Found</h2>
            <p className="mt-2 text-muted-foreground">The puzzle you are looking for does not exist or is not available.</p>
        </div>
      );
  }

  if (err === 'load' || !puzzle) {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-background">
            <h2 className="text-2xl font-bold">Error Loading Puzzle</h2>
            <p className="mt-2 text-muted-foreground">There was a problem loading this puzzle. Please try again later.</p>
        </div>
      );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
        <AppHeader variant="default" />
        {puzzle.puzzleType === 'crossword' && <CrosswordPlayer puzzle={puzzle} />}
        {/* Future puzzle types can be rendered here */}
    </div>
  );
}
