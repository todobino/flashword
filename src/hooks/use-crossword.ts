
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Grid, Cell, Clue, Puzzle, TemplateName } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { generatePattern } from '@/lib/grid-generator';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, arrayUnion, query, where, getDocs, orderBy, limit, setDoc } from 'firebase/firestore';


export const createGrid = (size: number): Grid => {
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

export const useCrossword = (
    initialSize = 15, 
    initialGrid?: Grid, 
    initialClues?: { across: Clue[], down: Clue[] }, 
    initialTitle?: string,
    initialId?: string,
    user?: User | null
) => {
  const [size, setSize] = useState(initialSize);
  const [grid, setGrid] = useState<Grid>(() => initialGrid || createGrid(initialSize));
  const [clues, setClues] = useState<{ across: Clue[], down: Clue[] }>(() => initialClues || { across: [], down: [] });
  const [selectedClue, setSelectedClue] = useState<{ number: number; direction: 'across' | 'down' } | null>(null);
  const [title, setTitle] = useState(initialTitle || '');
  const [puzzleId, setPuzzleId] = useState<string | undefined>(initialId);

  const { toast } = useToast();

  const updateClues = useCallback((currentGrid: Grid, currentSize: number) => {
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
    

    const oldClues = clues;
    
    // Preserve existing clue text when the grid changes
    const updateClueText = (newClues: Clue[], oldClues: Clue[]) => {
      const oldCluesMap = new Map(oldClues.map(c => [`${c.number}-${c.direction}`, c.text]));
      return newClues.map(nc => {
          const oldText = oldCluesMap.get(`${nc.number}-${nc.direction}`);
          return { ...nc, text: oldText || '' };
      });
    };
    
    setGrid(newGrid);
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

  const savePuzzle = async (asNew = false) => {
    if (!user) {
        toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to save a puzzle." });
        return;
    }
    
    try {
        const puzzleData = {
            owner: user.uid,
            title,
            size,
            grid,
            clues,
            updatedAt: serverTimestamp(),
        };

        if (puzzleId && !asNew) {
            // Update existing puzzle
            const puzzleRef = doc(db, "puzzles", puzzleId);
            await updateDoc(puzzleRef, puzzleData);
            toast({ title: "Puzzle Updated!", description: "Your crossword has been updated in Firestore." });
        } else {
            // Create new puzzle
            const puzzleWithCreateTime = {
                ...puzzleData,
                createdAt: serverTimestamp(),
            };
            const puzzleRef = await addDoc(collection(db, "puzzles"), puzzleWithCreateTime);
            setPuzzleId(puzzleRef.id);
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, { puzzleIds: arrayUnion(puzzleRef.id) });
            toast({ title: "Puzzle Saved!", description: "Your crossword has been saved to Firestore." });
        }
    } catch (e) {
        console.error("Save failed: ", e);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save puzzle to Firestore." });
    }
  };

  const savePuzzleAs = () => savePuzzle(true);

  const loadPuzzle = async (): Promise<Puzzle | null> => {
    if (!user) {
      toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to load a puzzle." });
      return null;
    }
    try {
      const q = query(
          collection(db, "puzzles"), 
          where("owner", "==", user.uid),
          orderBy("updatedAt", "desc"),
          limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const puzzleDoc = querySnapshot.docs[0];
        const puzzleData = puzzleDoc.data() as Omit<Puzzle, 'id'>;
        const loadedPuzzle: Puzzle = { id: puzzleDoc.id, ...puzzleData };
        
        setSize(loadedPuzzle.size);
        setGrid(loadedPuzzle.grid);
        setClues(loadedPuzzle.clues);
        setTitle(loadedPuzzle.title);
        setPuzzleId(loadedPuzzle.id);
        setSelectedClue(null);
        toast({ title: "Puzzle Loaded!", description: `Loaded "${loadedPuzzle.title}".` });
        return loadedPuzzle;

      } else {
        toast({ variant: "destructive", title: "Load Failed", description: "No saved puzzles found for your account." });
        return null;
      }
    } catch (e) {
      console.error("Load failed:", e);
      toast({ variant: "destructive", title: "Load Failed", description: "Could not load puzzle from Firestore." });
      return null;
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
            newGrid[clue.row][clue.col + i].char = normalizedWord[i] === ' ' ? '' : normalizedWord[i];
        }
    } else {
        for (let i = 0; i < clue.length; i++) {
            newGrid[clue.row + i][clue.col].char = normalizedWord[i] === ' ' ? '' : normalizedWord[i];
        }
    }
    setGrid(newGrid);
  };


  const currentClueDetails = useMemo(() => {
    if (!selectedClue) return null;
    const allClues = [...clues.across, ...clues.down];
    return allClues.find(c => c.number === selectedClue.number && c.direction === selectedClue.direction);
  }, [selectedClue, clues]);

  const resetGrid = (newSize: number, newGrid?: Grid, newClues?: {across: Clue[], down: Clue[]}, newTitle?: string, newId?: string) => {
    setSize(newSize);
    const gridToUpdate = newGrid || createGrid(newSize);
    setClues(newClues || { across: [], down: [] });
    setTitle(newTitle || '');
    setPuzzleId(newId);
    updateClues(gridToUpdate, newSize);
  };

  const randomizeGrid = useCallback((templateName: TemplateName = 'Classic') => {
    try {
      let blackSquareTarget: number;
      switch (templateName) {
        case 'Classic':
          blackSquareTarget = 0.20;
          break;
        case 'Blocked':
          blackSquareTarget = 0.30;
          break;
        case 'Wide Open':
          blackSquareTarget = 0.15;
          break;
        default:
          blackSquareTarget = 0.16; // Default case
      }

      const pattern = generatePattern(size, blackSquareTarget);
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
    title,
    setTitle,
    puzzleId,
    toggleCellBlack,
    updateCellChar,
    clues,
    updateClueText,
    selectedClue,
    setSelectedClue,
    currentClueDetails,
    savePuzzle,
    savePuzzleAs,
    loadPuzzle,
    getWordFromGrid,
    resetGrid,
    updateClues,
    randomizeGrid,
    fillWord,
  };
};

    
