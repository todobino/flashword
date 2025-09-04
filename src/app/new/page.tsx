
'use client';

import { useRouter } from 'next/navigation';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import type { Puzzle } from '@/lib/types';
import { useCrosswordStore } from '@/store/crossword-store';

export default function NewPuzzlePage() {
    const router = useRouter();
    const setPuzzle = useCrosswordStore((state) => state.setPuzzle);

    const handleStartBuilder = (puzzle: Puzzle) => {
        if (!puzzle.id) {
            console.error("Cannot redirect, puzzle ID is missing.");
            // Optionally, show a toast or error message to the user
            return;
        }
        router.push(`/edit/${puzzle.id}`);
    };

    const handleLoad = (puzzle: Puzzle) => {
        if (!puzzle.id) {
            console.error("Cannot redirect, puzzle ID is missing.");
            return;
        }
        router.push(`/edit/${puzzle.id}`);
    };
    
    return (
        <NewPuzzleWizard onStartBuilder={handleStartBuilder} onLoad={handleLoad} />
    );
}
