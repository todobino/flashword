
import { getPuzzleAction } from '@/app/actions';
import { CrosswordPlayer } from '@/components/crossword-player';
import { db } from '@/lib/firebase';
import type { PlayablePuzzle } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { notFound } from 'next/navigation';

export default async function PlayPuzzleBySlugPage({ params }: { params: { slug: string } }) {
  
  const slugRef = doc(db, 'slugs', params.slug);
  const slugSnap = await getDoc(slugRef);
  
  if (!slugSnap.exists()) {
    notFound();
  }

  const { puzzleId } = slugSnap.data();

  if (!puzzleId) {
    notFound();
  }

  const { data: puzzle, error } = await getPuzzleAction(puzzleId);

  if (error || !puzzle) {
    notFound();
  }

  return <CrosswordPlayer puzzle={puzzle as PlayablePuzzle} />;
}
