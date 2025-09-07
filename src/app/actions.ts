
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
  const adminDb = admin.firestore();
  const { FieldValue, FieldPath } = await import('firebase-admin/firestore');

  try {
    const uid = await getServerUid();

    // 1) Find the draft by ID across all users (for diagnostics & correctness)
    const cg = await adminDb
      .collectionGroup('puzzles')
      .where(FieldPath.documentId(), '==', puzzleId)
      .limit(1)
      .get();

    if (cg.empty) throw new Error('Draft not found');

    const draftSnap = cg.docs[0];
    const parentUserId = draftSnap.ref.parent.parent?.id; // users/{uid}/puzzles/{id}
    if (!parentUserId) throw new Error('Bad parent path');

    // 2) Ownership check
    if (parentUserId !== uid) {
      throw new Error(`Forbidden: puzzle belongs to ${parentUserId}`);
    }

    const data = draftSnap.data() as PuzzleDoc;

    // 3) Validate minimal shape
    if (!Array.isArray(data.grid) || !Array.isArray(data.entries)) {
      throw new Error('Invalid puzzle payload');
    }

    // 4) Idempotent publish
    const now = FieldValue.serverTimestamp();
    const publicRef = adminDb.doc(`puzzles/${puzzleId}`);
    const privateRef = adminDb.doc(`users/${uid}/puzzles/${puzzleId}`);

    await adminDb.runTransaction(async (tx) => {
      const fresh = await tx.get(privateRef);
      if (!fresh.exists) throw new Error('Draft vanished');
      const doc = fresh.data() as PuzzleDoc;

      if (doc.owner && doc.owner !== uid) throw new Error('Forbidden');
      const createdAt = doc.createdAt ?? now;

      tx.set(
        publicRef,
        {
          title: doc.title || 'Untitled Puzzle',
          status: 'published',
          size: doc.size,
          grid: doc.grid,
          entries: doc.entries,
          createdAt,
          updatedAt: now,
          publishedAt: now,
          owner: uid,
          author: doc.author || 'Anonymous',
        },
        { merge: true }
      );

      if (doc.status !== 'published') {
        tx.update(privateRef, { status: 'published', updatedAt: now, owner: uid });
      }
    });

    return { success: true };
  } catch (e: any) {
    console.error('publishPuzzleAction', { puzzleId, err: e?.message });
    return { success: false, error: e?.message || 'Publish failed' };
  }
}
