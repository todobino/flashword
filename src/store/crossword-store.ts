
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Puzzle } from '@/lib/types';

interface CrosswordState {
  puzzle: Omit<Puzzle, 'grid' | 'clues'> & { grid: any, clues: any } | null;
  setPuzzle: (puzzle: Puzzle) => void;
  clearPuzzle: () => void;
}

export const useCrosswordStore = create<CrosswordState>()(
  persist(
    (set) => ({
      puzzle: null,
      setPuzzle: (puzzle) => set({ puzzle }),
      clearPuzzle: () => set({ puzzle: null }),
    }),
    {
      name: 'crossword-storage', 
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
