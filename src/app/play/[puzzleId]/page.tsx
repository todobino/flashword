
import { CrosswordPlayer } from '@/components/crossword-player';
import { getPuzzleAction } from '@/app/actions';
import { notFound } from 'next/navigation';
import type { PlayablePuzzle } from '@/lib/types';


export default async function PlayPuzzlePage({ params }: { params: { puzzleId: string } }) {
  
  const { data: puzzle, error } = await getPuzzleAction(params.puzzleId);

  if (error || !puzzle) {
    notFound();
  }

  return <CrosswordPlayer puzzle={puzzle} />;
}
