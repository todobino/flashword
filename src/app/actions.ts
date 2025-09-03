'use server';

import { suggestClue as suggestClueFlow, type ClueSuggestionInput } from '@/ai/flows/clue-suggestion';

export async function suggestClueAction(input: ClueSuggestionInput) {
  try {
    const result = await suggestClueFlow(input);
    return { success: true, data: result };
  } catch (error) {
    console.error('Error suggesting clue:', error);
    return { success: false, error: 'Failed to suggest a clue due to a server error.' };
  }
}
