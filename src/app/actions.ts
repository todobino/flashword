
'use server';

import { suggestClue as suggestClueFlow, type ClueSuggestionInput } from '@/ai/flows/clue-suggestion';
import { verifyPuzzle as verifyPuzzleFlow, type VerifyPuzzleInput } from '@/ai/flows/puzzle-verification';
import { fillThemeWords as fillThemeWordsFlow, type ThemeFillInput, type ThemeFillOutput } from '@/ai/flows/theme-fill';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { PuzzleDoc, PlayablePuzzle } from '@/lib/types';


export async function suggestClueAction(input: ClueSuggestionInput) {
  try {
    const result = await suggestClueFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error suggesting clue:', error);
    return { success: false, error: 'Failed to suggest a clue due to a server error.' };
  }
}

export async function verifyPuzzleAction(input: VerifyPuzzleInput) {
  try {
    const result = await verifyPuzzleFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error verifying puzzle:', error);
    return { success: false, error: 'Failed to verify the puzzle due to a server error.' };
  }
}

export async function fillThemeWordsAction(input: ThemeFillInput): Promise<{ success: boolean, data?: ThemeFillOutput, error?: string }> {
    try {
      const result = await fillThemeWordsFlow(input);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error generating theme:', error);
      return { success: false, error: 'Failed to generate a theme due to a server error.' };
    }
}

export async function getPublishedPuzzlesAction(): Promise<{ success: boolean, data?: PlayablePuzzle[], error?: string }> {
    try {
        const puzzlesRef = collection(db, 'puzzles');
        const q = query(puzzlesRef, where('status', '==', 'published'), orderBy('createdAt', 'desc'), limit(12));
        const querySnapshot = await getDocs(q);
        
        const puzzles = querySnapshot.docs.map(doc => {
            const data = doc.data() as PuzzleDoc;
            return {
                id: doc.id,
                title: data.title,
                size: data.size,
                author: data.author,
                createdAt: data.createdAt.toDate(),
                grid: data.grid, // For preview on the card
            };
        });
        
        return { success: true, data: puzzles };
    } catch (error) {
        console.error("Error fetching published puzzles: ", error);
        return { success: false, error: 'Failed to fetch published puzzles.' };
    }
}

export async function getPuzzleAction(puzzleId: string): Promise<{ success: boolean, data?: PlayablePuzzle, error?: string }> {
    try {
        const puzzleRef = doc(db, 'puzzles', puzzleId);
        const docSnap = await getDoc(puzzleRef);

        if (!docSnap.exists()) {
            return { success: false, error: 'Puzzle not found.' };
        }

        const data = docSnap.data() as PuzzleDoc;

        // For published puzzles, anyone can play. For drafts, only the owner.
        // This check would need the current user's ID, which we can't get here directly.
        // We'll assume the client handles the redirect if a user isn't logged in for their own draft.
        // For now, let's just ensure it's published to be safe.
        if (data.status !== 'published') {
             return { success: false, error: 'This puzzle is not available to play.' };
        }
        
        const puzzle: PlayablePuzzle = {
            id: docSnap.id,
            title: data.title,
            author: data.author,
            size: data.size,
            grid: data.grid,
            entries: data.entries,
            createdAt: data.createdAt.toDate(),
        };

        return { success: true, data: puzzle };

    } catch (error) {
        console.error("Error fetching puzzle: ", error);
        return { success: false, error: 'Failed to fetch the puzzle.' };
    }
}
