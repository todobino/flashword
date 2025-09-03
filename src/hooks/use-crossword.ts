'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Grid, Cell, Clue, Puzzle } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { generatePattern } from '@/lib/grid-generator';


const createGrid = (size: number): Grid => {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => ({
      row,
      col,
      isBlack: false,
      char: '',
      number: null,
    }))
  );
};

export const useCrossword = (initialSize = 15, initialGrid?: Grid, initialClues?: { across: Clue[], down: Clue[] }) => {
  const [size, setSize] = useState(initialSize);
  const [grid, setGrid] = useState<Grid>(() => initialGrid || createGrid(initialSize));
  const [clues, setClues] = useState<{ across: Clue[], down: Clue[] }>(() => initialClues || { across: [], down: [] });
  const [selectedClue, setSelectedClue] = useState<{ number: number; direction: 'across' | 'down' } | null>(null);
  const { toast } = useToast();

  const updateClues = useCallback((currentGrid: Grid, currentSize: number, currentClues?: { across: Clue[], down: Clue[] }) => {
    const newGrid = JSON.parse(JSON.stringify(currentGrid));
    const newAcrossClues: Clue[] = [];
    const newDownClues: Clue[] = [];
    let clueCounter = 1;

    for (let row = 0; row < currentSize; row++) {
      for (let col = 0; col < currentSize; col++) {
        const cell = newGrid[row][col];
        if (cell.isBlack) {
          cell.number = null;
          continue;
        }

        const isAcrossStart = col === 0 || newGrid[row][col - 1].isBlack;
        const isDownStart = row === 0 || newGrid[row - 1][col].isBlack;
        
        const hasAcrossWord = col + 1 < currentSize && !newGrid[row][col + 1].isBlack;
        const hasDownWord = row + 1 < currentSize && !newGrid[row + 1][col].isBlack;

        let isClueStart = false;
        if (isAcrossStart && hasAcrossWord) {
            let length = 0;
            for (let i = col; i < currentSize && !newGrid[row][i].isBlack; i++) {
              length++;
            }
            if (length > 2) { // Words must be 3+ letters
              newAcrossClues.push({ number: clueCounter, direction: 'across', text: '', row, col, length });
              isClueStart = true;
            }
        }
        if (isDownStart && hasDownWord) {
            let length = 0;
            for (let i = row; i < currentSize && !newGrid[i][col].isBlack; i++) {
              length++;
            }
            if (length > 2) { // Words must be 3+ letters
              newDownClues.push({ number: clueCounter, direction: 'down', text: '', row, col, length });
              isClueStart = true;
            }
        }
        
        if (isClueStart) {
            cell.number = clueCounter;
            clueCounter++;
        } else {
            cell.number = null;
        }
      }
    }
    setGrid(newGrid);

    const oldClues = currentClues || clues;
    
    const updateClueText = (newClues: Clue[], oldClues: Clue[]) => {
      return newClues.map(nc => {
        const old = oldClues.find(oc => oc.number === nc.number && oc.direction === nc.direction);
        return old ? { ...nc, text: old.text } : nc;
      });
    };

    setClues({
      across: updateClueText(newAcrossClues, oldClues.across),
      down: updateClueText(newDownClues, oldClues.down),
    });
  }, [clues]);

  const toggleCellBlack = (row: number, col: number) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[row][col].isBlack = !newGrid[row][col].isBlack;
    newGrid[row][col].char = '';
    
    const symmetricRow = size - 1 - row;
    const symmetricCol = size - 1 - col;
    if (row !== symmetricRow || col !== symmetricCol) {
      newGrid[symmetricRow][symmetricCol].isBlack = newGrid[row][col].isBlack;
      newGrid[symmetricRow][symmetricCol].char = '';
    }
    updateClues(newGrid, size);
  };
  
  const updateCellChar = (row: number, col: number, char: string) => {
    if (grid[row][col].isBlack) return;
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[row][col].char = char.toUpperCase();
    setGrid(newGrid);
  };
  
  const updateClueText = (number: number, direction: 'across' | 'down', text: string) => {
    setClues(prev => ({
      ...prev,
      [direction]: prev[direction].map(clue => 
        clue.number === number ? { ...clue, text } : clue
      ),
    }));
  };

  const savePuzzle = () => {
    try {
      const puzzle: Puzzle = { grid, clues, size, title: '' }; // title is not managed here
      localStorage.setItem('flossyWordPuzzle', JSON.stringify(puzzle));
      toast({ title: "Puzzle Saved!", description: "Your crossword has been saved to local storage." });
    } catch (e) {
      toast({ variant: "destructive", title: "Save Failed", description: "Could not save puzzle to local storage." });
    }
  };

  const loadPuzzle = (callback?: () => void) => {
    try {
      const saved = localStorage.getItem('flossyWordPuzzle');
      if (saved) {
        const puzzle: Puzzle = JSON.parse(saved);
        setSize(puzzle.size);
        setGrid(puzzle.grid);
        setClues(puzzle.clues);
        setSelectedClue(null);
        toast({ title: "Puzzle Loaded!", description: "Your crossword has been loaded." });
        if(callback) callback();
      } else {
        toast({ variant: "destructive", title: "Load Failed", description: "No saved puzzle found." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Load Failed", description: "Could not load puzzle from local storage." });
    }
  };

  const getWordFromGrid = (clue: { number: number; direction: 'across' | 'down' }) => {
    const clueData = clues[clue.direction].find(c => c.number === clue.number);
    if (!clueData) return '';
    
    let word = '';
    if (clue.direction === 'across') {
      for (let i = 0; i < clueData.length; i++) {
        const cell = grid[clueData.row][clueData.col + i];
        word += cell.char || '_';
      }
    } else {
      for (let i = 0; i < clueData.length; i++) {
        const cell = grid[clueData.row + i][clueData.col];
        word += cell.char || '_';
      }
    }
    return word;
  };

  const fillWord = (clue: Clue, word: string) => {
    const newGrid = JSON.parse(JSON.stringify(grid));
    const normalizedWord = word.toUpperCase().padEnd(clue.length, ' ');
    if (clue.direction === 'across') {
        for (let i = 0; i < clue.length; i++) {
            newGrid[clue.row][clue.col + i].char = normalizedWord[i] || '';
        }
    } else {
        for (let i = 0; i < clue.length; i++) {
            newGrid[clue.row + i][clue.col].char = normalizedWord[i] || '';
        }
    }
    setGrid(newGrid);
  };


  const currentClueDetails = useMemo(() => {
    if (!selectedClue) return null;
    const allClues = [...clues.across, ...clues.down];
    return allClues.find(c => c.number === selectedClue.number && c.direction === selectedClue.direction);
  }, [selectedClue, clues]);

  const resetGrid = (newSize: number, newGrid?: Grid, newClues?: {across: Clue[], down: Clue[]}) => {
    setSize(newSize);
    const gridToUpdate = newGrid || createGrid(newSize);
    updateClues(gridToUpdate, newSize, newClues);
  };

  const randomizeGrid = useCallback(() => {
    if (size !== 15 && size !== 17 && size !== 19 && size !== 21) {
        toast({ variant: "destructive", title: "Randomization Failed", description: `No generator for size ${size}x${size}.` });
        return;
    }
    try {
      const pattern = generatePattern(size);
      const newGrid = createGrid(size);

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          newGrid[r][c].isBlack = pattern.grid[r][c] === '#';
        }
      }
      updateClues(newGrid, size);
    } catch (error) {
      console.error("Failed to randomize grid:", error);
      toast({ variant: "destructive", title: "Randomization Failed", description: "Could not generate a random pattern." });
      updateClues(createGrid(size), size);
    }
  }, [size, toast, updateClues]);

  return {
    size,
    grid,
    setGrid,
    toggleCellBlack,
    updateCellChar,
    clues,
    updateClueText,
    selectedClue,
    setSelectedClue,
    currentClueDetails,
    savePuzzle,
    loadPuzzle,
    getWordFromGrid,
    resetGrid,
    updateClues,
    randomizeGrid,
    fillWord,
  };
};
