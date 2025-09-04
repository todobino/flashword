
import { CrosswordEditor } from '@/components/crossword-editor';

export default function EditPuzzlePage({ params }: { params: { puzzleId: string } }) {
  return <CrosswordEditor puzzleId={params.puzzleId} />;
}
