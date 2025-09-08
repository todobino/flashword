
'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Grid, Cell, Entry, Puzzle, PuzzleDoc, TemplateName, Direction, PlayablePuzzle } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { generatePattern } from '@/lib/grid-generator';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, query, orderBy, limit, setDoc, getDocs, deleteField, deleteDoc } from 'firebase/firestore';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export interface PuzzleStats {
    answersCompletion: number;
    filledSquares: number;
    totalSquares: number;
    cluesCompletion: number;
    filledClues: number;
    totalClues: number;
    difficulty: 'Easy' | 'Medium' | 'Challenging' | 'Hard';
}


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
    user?: User | null,
    initialStatus?: 'draft' | 'published',
    initialCreatedAt?: Date,
    initialAuthor?: string,
) => {
  const [size, setSize] = useState(initialSize);
  const [grid, setGrid] = useState<Grid>(() => initialGrid || createGrid(initialSize));
  const [clues, setClues] = useState<{ across: Entry[], down: Entry[] }>(() => initialClues || { across: [], down: [] });
  const [selectedClue, setSelectedClue] = useState<{ number: number; direction: 'across' | 'down' } | null>(null);
  const [title, setTitle] = useState(initialTitle || '');
  const [puzzleId, setPuzzleId] = useState<string | undefined>(initialId);
  const [status, setStatus] = useState<'draft' | 'published'>(initialStatus || 'draft');
  const [createdAt, setCreatedAt] = useState<Date | undefined>(initialCreatedAt);
  const [author, setAuthor] = useState<string>(initialAuthor || 'Anonymous');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const { toast } = useToast();
  const router = useRouter();

  const updateClues = useCallback((currentGrid: Grid, currentSize: number, currentClues: { across: Entry[], down: Entry[] }) => {
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
    
    const oldCluesMap = new Map();
    if (currentClues) {
        [...currentClues.across, ...currentClues.down].forEach(c => {
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
  }, []);

  const resetGrid = useCallback((newSize: number, newGrid?: Grid, newClues?: {across: Entry[], down: Entry[]}, newTitle?: string, newId?: string, newStatus?: 'draft' | 'published', newCreatedAt?: Date, newAuthor?: string) => {
    setSize(newSize);
    const gridToUpdate = newGrid || createGrid(newSize);
    setGrid(gridToUpdate);
    const cluesToUpdate = newClues || { across: [], down: [] };
    setClues(cluesToUpdate);
    setTitle(newTitle || '');
    setPuzzleId(newId);
    setStatus(newStatus || 'draft');
    setCreatedAt(newCreatedAt);
    setAuthor(newAuthor || user?.displayName || 'Anonymous');
    updateClues(gridToUpdate, newSize, cluesToUpdate);
  }, [updateClues, user]);

  useEffect(() => {
    resetGrid(initialSize, initialGrid, initialClues, initialTitle, initialId, initialStatus, initialCreatedAt, initialAuthor);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGrid, initialClues, initialTitle, initialId, initialSize, initialStatus, initialCreatedAt, initialAuthor]);


  const toggleCellBlack = (row: number, col: number) => {
    if (status === 'published') {
      toast({ variant: 'destructive', title: "Cannot Edit Published Puzzle", description: "The grid of a published puzzle cannot be changed." });
      return;
    }
    const newGrid = JSON.parse(JSON.stringify(grid));
    newGrid[row][col].isBlack = !newGrid[row][col].isBlack;
    newGrid[row][col].char = '';
    
    const symmetricRow = size - 1 - row;
    const symmetricCol = size - 1 - col;
    if (row !== symmetricRow || col !== symmetricCol) {
      newGrid[symmetricRow][symmetricCol].isBlack = newGrid[row][col].isBlack;
      newGrid[symmetricRow][symmetricCol].char = '';
    }
    updateClues(newGrid, size, clues);
  };
  
  const updateCellChar = (row: number, col: number, char: string, direction?: Direction) => {
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

  const getWordFromGrid = useCallback((clue: { number: number; direction: 'across' | 'down' }) => {
    const clueData = [...clues.across, ...clues.down].find(c => c.number === clue.number && c.direction === clue.direction);
    if (!clueData) return '';
    
    let word = '';
    if (clue.direction === 'across') {
      for (let i = 0; i < clueData.length; i++) {
        const cell = grid[clueData.row][clueData.col + i];
        word += cell ? (cell.char || '_') : '_';
      }
    } else {
      for (let i = 0; i < clueData.length; i++) {
         const cell = grid[clueData.row + i][clueData.col];
        word += cell ? (cell.char || '_') : '_';
      }
    }
    return word;
  }, [grid, clues]);

  const savePuzzle = useCallback(async () => {
    if (!user || !puzzleId || status === 'published') { // Don't auto-save published puzzles
        return;
    }
    
    setIsSaving(true);
    try {
        const allEntries = [...clues.across, ...clues.down].map(entry => {
            return { ...entry, answer: getWordFromGrid(entry).replace(/_/g, ' ') };
        });

        const puzzleDoc: Partial<PuzzleDoc> = {
            owner: user.uid,
            title,
            size,
            status: status,
            grid: grid.map(row => row.map(cell => cell.isBlack ? '#' : (cell.char || '.')).join('')),
            entries: allEntries
        };

        const puzzleRef = doc(db, "users", user.uid, "puzzles", puzzleId);
        await updateDoc(puzzleRef, {
            ...puzzleDoc,
            updatedAt: serverTimestamp(),
        });
        setLastSaved(new Date());
    } catch (e) {
        console.error("Save failed: ", e);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not save puzzle to Firestore." });
    } finally {
        setIsSaving(false);
    }
  }, [user, puzzleId, title, size, status, grid, clues, getWordFromGrid, toast]);
  
  const publishPuzzle = async () => {
    if (!puzzleId || !user) {
        toast({ variant: 'destructive', title: 'Publish Failed', description: 'Cannot publish without a puzzle ID and user.' });
        return;
    }
    
    setIsSaving(true);
    const userPuzzleRef = doc(db, 'users', user.uid, 'puzzles', puzzleId);
    let slug: string | null = null;
    let publicCreated = false;

    try {
        // 1) private -> published
        await updateDoc(userPuzzleRef, {
          status: 'published',
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
        });
        setStatus('published');

        // 2) allocate slug (retry on conflict)
        function randSlug() {
          const ADJ = ['brisk','quiet','lucky','clever','mellow','vivid'];
          const NOUN = ['otter','falcon','maple','nebula','canyon','beacon'];
          const a = ADJ[Math.floor(Math.random()*ADJ.length)];
          const n = NOUN[Math.floor(Math.random()*NOUN.length)];
          const sfx = Math.floor(Math.random()*100).toString().padStart(2,'0');
          return `${a}-${n}-${sfx}`;
        }
        
        for (let i = 0; i < 20; i++) {
          const candidate = randSlug();
          try {
            await setDoc(doc(db,'slugs', candidate), {
              uid: user!.uid, puzzleId, createdAt: serverTimestamp()
            }, { merge: false });
            slug = candidate;
            break;
          } catch (err: any) {
            if ((err as any).code === 'permission-denied') continue;
            throw err;
          }
        }
        if (!slug) throw new Error('Failed to allocate slug');

        // 3) create the public copy WITH slug (no update later)
        const publicData = {
          title,
          status: 'published',
          size,
          grid: grid.map(row => row.map(c => c.isBlack ? '#' : (c.char || '.')).join('')),
          entries: [...clues.across, ...clues.down].map(e => ({
            ...e, answer: getWordFromGrid(e).replace(/_/g, ' ')
          })),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          publishedAt: serverTimestamp(),
          owner: user!.uid,
          author: user!.displayName || 'Anonymous',
          slug, // set on create
        };
        await setDoc(doc(db,'puzzles', puzzleId!), publicData, { merge: false });
        publicCreated = true;

        // 4) add slug to private doc
        await updateDoc(userPuzzleRef, { slug, updatedAt: serverTimestamp() });

        toast({ title: 'Puzzle Published!', description: 'Your puzzle is now public and can be shared.' });
        setLastSaved(new Date());
        router.push(`/play/${slug}`);

    } catch (error: any) {
      console.error('Error publishing puzzle:', error);
      toast({ variant: 'destructive', title: 'Publish Failed', description: error.message });
       
      if (!publicCreated) {
        await updateDoc(userPuzzleRef, { 
            status: 'draft',
            publishedAt: deleteField(),
            updatedAt: serverTimestamp() 
        });
        if (slug) {
            await deleteDoc(doc(db, 'slugs', slug));
        }
        setStatus('draft');
      }
    } finally {
      setIsSaving(false);
    }
  };


  const createAndSaveDraft = async (): Promise<string | undefined> => {
     if (!user) {
        toast({ variant: "destructive", title: "Login Required", description: "You must be logged in to save a puzzle." });
        return;
    }
    try {
        setIsSaving(true);
        const allEntries = [...clues.across, ...clues.down].map(entry => {
            return { ...entry, answer: getWordFromGrid(entry).replace(/_/g, ' ') };
        });

        const puzzleDoc: Omit<PuzzleDoc, 'id' | 'publishedAt'> = {
            owner: user.uid,
            author: user.displayName || 'Anonymous',
            title: title || "Untitled Puzzle",
            size,
            status: "draft",
            grid: grid.map(row => row.map(cell => cell.isBlack ? '#' : (cell.char || '.')).join('')),
            entries: allEntries,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        const userPuzzlesRef = collection(db, "users", user.uid, "puzzles");
        const newPuzzleRef = await addDoc(userPuzzlesRef, puzzleDoc);
        setPuzzleId(newPuzzleRef.id);
        setStatus('draft');
        setCreatedAt(new Date());
        setAuthor(user.displayName || 'Anonymous');
        toast({ title: "Draft Saved!", description: "Your new puzzle has been saved." });
        setLastSaved(new Date());
        return newPuzzleRef.id;
    } catch (e) {
        console.error("Draft creation failed: ", e);
        toast({ variant: "destructive", title: "Save Failed", description: "Could not create puzzle draft." });
    } finally {
        setIsSaving(false);
    }
  }

    const debouncedGrid = useDebounce(grid, 1500);
    const debouncedClues = useDebounce(clues, 1500);
    const debouncedTitle = useDebounce(title, 1500);

    useEffect(() => {
        if (puzzleId && user && status === 'draft') {
            savePuzzle();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedGrid, debouncedClues, debouncedTitle]);


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
            status: docData.status,
            author: docData.author,
            createdAt: docData.createdAt?.toDate(),
        };
        
        resetGrid(loadedPuzzle.size, loadedPuzzle.grid, loadedPuzzle.clues, loadedPuzzle.title, loadedPuzzle.id, loadedPuzzle.status, loadedPuzzle.createdAt, loadedPuzzle.author);

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
    if (!selectedClue || !clues) return null;
    const allClues = [...clues.across, ...clues.down];
    return allClues.find(c => c.number === selectedClue.number && c.direction === selectedClue.direction) || null;
  }, [selectedClue, clues]);

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
      updateClues(newGrid, size, clues);
    } catch (error) {
      console.error("Failed to randomize grid:", error);
      toast({ variant: "destructive", title: "Randomization Failed", description: "Could not generate a random pattern." });
      updateClues(createGrid(size), size, {across: [], down: []});
    }
  }, [size, toast, updateClues, clues]);

  const stats = useMemo<PuzzleStats>(() => {
    const flatGrid = grid.flat();
    const whiteSquares = flatGrid.filter(cell => !cell.isBlack);
    const totalSquares = whiteSquares.length;
    const filledSquares = whiteSquares.filter(cell => cell.char !== '').length;
    const answersCompletion = totalSquares > 0 ? (filledSquares / totalSquares) * 100 : 0;
    
    const blackSquareCount = flatGrid.length - totalSquares;
    const blackSquarePercentage = (blackSquareCount / flatGrid.length);
    const allClues = [...clues.across, ...clues.down];
    const totalClues = allClues.length;
    const filledClues = allClues.filter(c => c.clue.trim() !== '').length;
    const cluesCompletion = totalClues > 0 ? (filledClues / totalClues) * 100 : 0;

    const totalWordLetters = allClues.reduce((sum, clue) => sum + clue.length, 0);
    const avgWordLength = totalWordLetters > 0 ? totalWordLetters / totalClues : 0;
    
    let difficulty: PuzzleStats['difficulty'] = 'Medium';
    if (avgWordLength > 5.5 && blackSquarePercentage < 0.17) {
        difficulty = 'Hard';
    } else if (avgWordLength > 5.0 && blackSquarePercentage < 0.20) {
        difficulty = 'Challenging';
    } else if (avgWordLength < 4.5 || blackSquarePercentage > 0.25) {
        difficulty = 'Easy';
    }

    return { 
        answersCompletion, 
        filledSquares,
        totalSquares,
        cluesCompletion,
        filledClues,
        totalClues,
        difficulty,
    };

  }, [grid, clues]);

  const crossword = {
    size,
    grid,
    title,
    setTitle,
    puzzleId,
    status,
    createdAt,
    author,
    publishPuzzle,
    toggleCellBlack,
    updateCellChar,
    clues,
    updateClueText,
    selectedClue,
    setSelectedClue,
    currentClueDetails,
    loadPuzzle,
    getWordFromGrid,
    resetGrid,
    updateClues,
    randomizeGrid,
    fillWord,
    batchFillWords,
    createAndSaveDraft,
  };

  return { crossword, isSaving, lastSaved, stats };
};
