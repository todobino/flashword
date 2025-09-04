
'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Grid, Cell, Entry, Puzzle, PuzzleDoc, TemplateName, Direction } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { generatePattern } from '@/lib/grid-generator';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, where, getDocs, orderBy, limit, setDoc } from 'firebase/firestore';


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
    initialClues?: { across: Entry[], down: Entry[] }, 
    initialTitle?: string,
    initialId?: string,
    user?: User | null
) => {
  const [size, setSize] = useState(initialSize);
  const [grid, setGrid] = useState<Grid>(() => initialGrid || createGrid(initialSize));
  const [clues, setClues] = useState<{ across: Entry[], down: Entry[] }>(() => initialClues || { across: [], down: [] });
  const [selectedClue, setSelectedClue] = useState<{ number: number; direction: 'across' | 'down' } | null>(null);
  const [title, setTitle] = useState(initialTitle || '');
  const [puzzleId, setPuzzleId] = useState<string | undefined>(initialId);

  const { toast } = useToast();

  const updateClues = useCallback((currentGrid: Grid, currentSize: number) => {
    const newGrid = JSON.parse(JSON.stringify(currentGrid));
    const newAcrossClues: Entry[] = [];
    const newDownClues: Entry[] = [];
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
              const newEntry: Entry = { number: clueCounter, id: `${clueCounter}across`, direction: 'across', clue: '', answer: '', row, col, length };
              newAcrossClues.push(newEntry);
              isClueStart = true;
            }
        }
        if (isDownStart && hasDownWord) {
            let length = 0;
            for (let i = row; i < currentSize && !newGrid[i][col].isBlack; i++) {
              length++;
            }
            if (length > 2) { // Words must be 3+ letters
              const newEntry: Entry = { number: clueCounter, id: `${clueCounter}down`, direction: 'down', clue: '', answer: '', row, col, length };
              newDownClues.push(newEntry);
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
    
    // Find existing clues to preserve their text
    const oldCluesMap = new Map();
    if (clues) {
        [...clues.across, ...clues.down].forEach(c => {
            oldCluesMap.set(`${c.number}-${c.direction}`, c.clue);
        });
    }
    
    const updateClueText = (newCluesList: Entry[]) => {
      return newCluesList.map(nc => {
          const key = `${nc.number}-${nc.direction}`;
          return {...nc, clue: oldCluesMap.get(key) || ''};
      });
    };
    
    setGrid(newGrid);
    setClues({
      across: updateClueText(newAcrossClues),
      down: updateClueText(newDownClues),
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
        clue.number === number ? { ...clue, clue: text } : clue
      ),
    }));
  };

  const createAndSaveDraft = async (): Promise<string | undefined> => {
     if (!user) {
        toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to save a puzzle." });
        return;
    }
    try {
        const allEntries = [...clues.across, ...clues.down].map(entry => {
            return { ...entry, answer: getWordFromGrid(entry).replace(/_/g, ' ') };
        });

        const puzzleDoc: Omit<PuzzleDoc, 'createdAt' | 'updatedAt' | 'id'> = {
            owner: user.uid,
            title: title || "Untitled Puzzle",
            size,
            status: "draft",
            grid: grid.map(row => row.map(cell => cell.isBlack ? '#' : (cell.char || '.')).join('')),
            entries: allEntries
        };
        const userPuzzlesRef = collection(db, "users", user.uid, "puzzles");
        const newPuzzleRef = await addDoc(userPuzzlesRef, {
            ...puzzleDoc,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        setPuzzleId(newPuzzleRef.id);
        toast({ title: "Draft Saved!", description: "Your new puzzle has been saved." });
        return newPuzzleRef.id;
    } catch (e) {
        console.error("Draft creation failed: ", e);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not create puzzle draft." });
    }
  }

  const savePuzzle = async (asNew = false) => {
    if (!user) {
        toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to save a puzzle." });
        return;
    }
    
    try {
        const allEntries = [...clues.across, ...clues.down].map(entry => {
            return { ...entry, answer: getWordFromGrid(entry).replace(/_/g, ' ') };
        });

        const puzzleDoc: Omit<PuzzleDoc, 'createdAt' | 'updatedAt' | 'id'> = {
            owner: user.uid,
            title,
            size,
            status: "draft",
            grid: grid.map(row => row.map(cell => cell.isBlack ? '#' : (cell.char || '.')).join('')),
            entries: allEntries
        };

        if (puzzleId && !asNew) {
            // Update existing puzzle
            const puzzleRef = doc(db, "users", user.uid, "puzzles", puzzleId);
            await updateDoc(puzzleRef, {
                ...puzzleDoc,
                updatedAt: serverTimestamp(),
            });
            toast({ title: "Puzzle Updated!", description: "Your crossword has been updated." });
        } else {
            // Create new puzzle
            const newId = await createAndSaveDraft();
            if (newId) {
                setPuzzleId(newId);
            }
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
          collection(db, "users", user.uid, "puzzles"), 
          orderBy("updatedAt", "desc"),
          limit(1)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const puzzleDocSnap = querySnapshot.docs[0];
        const docData = puzzleDocSnap.data() as PuzzleDoc;
        
        const newGrid = createGrid(docData.size);
        docData.grid.forEach((rowStr, r) => {
            for(let c = 0; c < docData.size; c++) {
                const char = rowStr[c];
                if (char === '#') {
                    newGrid[r][c].isBlack = true;
                } else if (char !== '.') {
                    newGrid[r][c].char = char;
                }
            }
        });

        const newClues = {
            across: docData.entries.filter(e => e.direction === 'across'),
            down: docData.entries.filter(e => e.direction === 'down'),
        };

        const loadedPuzzle: Puzzle = { 
            id: puzzleDocSnap.id,
            title: docData.title,
            size: docData.size,
            grid: newGrid,
            clues: newClues,
        };
        
        resetGrid(loadedPuzzle.size, loadedPuzzle.grid, loadedPuzzle.clues, loadedPuzzle.title, loadedPuzzle.id);

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
    const clueData = [...clues.across, ...clues.down].find(c => c.number === clue.number && c.direction === clue.direction);
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

  const fillWord = (clue: Entry, word: string) => {
    setGrid(currentGrid => {
        const newGrid = JSON.parse(JSON.stringify(currentGrid));
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
        return newGrid;
    });
  };

  const batchFillWords = (wordList: { number: number; direction: 'across' | 'down'; word: string }[]) => {
    setGrid(currentGrid => {
        const newGrid = JSON.parse(JSON.stringify(currentGrid));
        
        for (const item of wordList) {
            const allClues = [...clues.across, ...clues.down];
            const clue = allClues.find(c => c.number === item.number && c.direction === item.direction);
            if (!clue) continue;

            const normalizedWord = item.word.toUpperCase().padEnd(clue.length, ' ');
            if (clue.direction === 'across') {
                for (let i = 0; i < clue.length; i++) {
                    newGrid[clue.row][clue.col + i].char = normalizedWord[i] === ' ' ? '' : normalizedWord[i];
                }
            } else {
                for (let i = 0; i < clue.length; i++) {
                    newGrid[clue.row + i][clue.col].char = normalizedWord[i] === ' ' ? '' : normalizedWord[i];
                }
            }
        }
        return newGrid;
    });
  };


  const currentClueDetails: Entry | null = useMemo(() => {
    if (!selectedClue) return null;
    const allClues = [...clues.across, ...clues.down];
    return allClues.find(c => c.number === selectedClue.number && c.direction === selectedClue.direction) || null;
  }, [selectedClue, clues]);

  const resetGrid = (newSize: number, newGrid?: Grid, newClues?: {across: Entry[], down: Entry[]}, newTitle?: string, newId?: string) => {
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
        case 'Condensed':
          blackSquareTarget = 0.30;
          break;
        case 'Clear':
          blackSquareTarget = 0.15;
          break;
        default:
          blackSquareTarget = 0.20; 
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
    batchFillWords,
    createAndSaveDraft,
  };
};

