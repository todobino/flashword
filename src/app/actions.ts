
'use server';

import { suggestClue as suggestClueFlow, type ClueSuggestionInput } from '@/ai/flows/clue-suggestion';
import { verifyPuzzle as verifyPuzzleFlow, type VerifyPuzzleInput } from '@/ai/flows/puzzle-verification';
import { fillThemeWords as fillThemeWordsFlow, type ThemeFillInput, type ThemeFillOutput } from '@/ai/flows/theme-fill';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import admin from '@/lib/firebase-admin';
import type { PuzzleDoc, PlayablePuzzle, Puzzle } from '@/lib/types';


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
                entries: [], // Not needed for listing
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


// A placeholder for a secure, server-side way to get the current user's ID
async function getServerUid(): Promise<string> {
    // In a real application, you would derive this from the session,
    // e.g., using NextAuth, Firebase session cookies, or by verifying an ID token.
    // For this prototype, we'll simulate a logged-in user. This is NOT secure for production.
    const SIMULATED_LOGGED_IN_USER_ID = "6AGnO1mCg9beYmXm1q2P1lJ07v42";
    if (!SIMULATED_LOGGED_IN_USER_ID) throw new Error('Unauthorized');
    return SIMULATED_LOGGED_IN_USER_ID;
}


export async function publishPuzzleAction(puzzleId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const uid = await getServerUid();
    const db = admin.firestore();

    const userPuzzleRef = db.doc(`users/${uid}/puzzles/${puzzleId}`);
    const publicPuzzleRef = db.doc(`puzzles/${puzzleId}`);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(userPuzzleRef);
      if (!snap.exists) throw new Error('Puzzle not found or you do not have permission to publish it.');
      const data = snap.data() as PuzzleDoc;

      if (data.owner !== uid) throw new Error('Forbidden: You are not the owner of this puzzle.');

      const now = admin.firestore.FieldValue.serverTimestamp();
      const isAlreadyPublished = data.status === 'published';

      // Whitelist the fields for the public payload to prevent leaking private data
      const publicPayload: Omit<PuzzleDoc, 'id'> = {
        title: data.title || 'Untitled Puzzle',
        status: 'published',
        size: data.size,
        grid: data.grid,
        entries: data.entries,
        createdAt: data.createdAt ?? now,
        updatedAt: now,
        publishedAt: data.publishedAt ?? now,
        owner: uid,
        author: data.author || 'Anonymous',
      };

      // Use set with merge to create or update the public document
      tx.set(publicPuzzleRef, publicPayload, { merge: true });
      
      // Only update the user's private doc if it's the first time publishing
      if (!isAlreadyPublished) {
        tx.update(userPuzzleRef, { status: 'published', updatedAt: now, publishedAt: now });
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error('publishPuzzleAction error', e);
    return { success: false, error: e.message || 'Publish failed due to a server error.' };
  }
}
