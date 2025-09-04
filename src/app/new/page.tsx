
'use client';

import { useRouter } from 'next/navigation';
import { NewPuzzleWizard } from '@/components/new-puzzle-wizard';
import type { Puzzle } from '@/lib/types';
import { useCrosswordStore } from '@/store/crossword-store';

export default function NewPuzzlePage() {
    const router = useRouter();
    const setPuzzle = useCrosswordStore((state) => state.setPuzzle);

    const handleStartBuilder = (puzzle: Puzzle) => {
        setPuzzle(puzzle);
        router.push('/edit');
    };

    const handleLoad = (puzzle: Puzzle) => {
        setPuzzle(puzzle);
        router.push('/edit');
    };
    
    return (
        <NewPuzzleWizard onStartBuilder={handleStartBuilder} onLoad={handleLoad} />
    );
}
