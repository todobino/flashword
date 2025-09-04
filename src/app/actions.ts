
'use server';

import { suggestClue as suggestClueFlow, type ClueSuggestionInput } from '@/ai/flows/clue-suggestion';
import { verifyPuzzle as verifyPuzzleFlow, type VerifyPuzzleInput } from '@/ai/flows/puzzle-verification';
import { generateTheme as generateThemeFlow, type ThemeGenerationInput, type ThemeGenerationOutput } from '@/ai/flows/theme-generation';


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

export async function generateThemeAction(input: ThemeGenerationInput): Promise<{ success: boolean, data?: ThemeGenerationOutput, error?: string }> {
    try {
      const result = await generateThemeFlow(input);
      return { success: true, data: result };
    } catch (error) {
      console.error('Error generating theme:', error);
      return { success: false, error: 'Failed to generate a theme due to a server error.' };
    }
}

    
