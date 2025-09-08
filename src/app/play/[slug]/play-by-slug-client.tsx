'use client';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { CrosswordPlayer } from '@/components/crossword-player';
import type { PlayablePuzzle, PuzzleDoc } from '@/lib/types';
import { LoaderCircle } from 'lucide-react';

export default function PlayBySlug({ slug }: { slug: string }) {
  const [puzzle, setPuzzle] = useState<PlayablePuzzle | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        };
        if (!cancelled) setPuzzle(playable);
      } catch {
        if (!cancelled) setErr('load');
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (err === 'not-found') {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-background">
            <h2 className="text-2xl font-bold">Puzzle Not Found</h2>
            <p className="mt-2 text-muted-foreground">The puzzle you are looking for does not exist or is not available.</p>
        </div>
      );
  }

  if (err === 'load') {
      return (
          <div className="flex flex-col items-center justify-center h-screen bg-background">
            <h2 className="text-2xl font-bold">Error Loading Puzzle</h2>
            <p className="mt-2 text-muted-foreground">There was a problem loading this puzzle. Please try again later.</p>
        </div>
      );
  }

  if (!puzzle) {
      return (
           <div className="flex flex-col items-center justify-center h-screen bg-background">
                <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
                <p className="mt-4 text-muted-foreground">Loading puzzle...</p>
            </div>
      );
  }

  return <CrosswordPlayer puzzle={puzzle} />;
}
