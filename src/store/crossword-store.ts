
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Puzzle } from '@/lib/types';

interface CrosswordState {
  puzzle: Puzzle | null;
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
      name: 'crossword-storage', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
    }
  )
);
