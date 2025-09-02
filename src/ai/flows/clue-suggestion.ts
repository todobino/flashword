'use server';

/**
 * @fileOverview A flow for suggesting crossword clues based on a given solution word.
 *
 * - suggestClue - A function that suggests clues for a given word.
 * - ClueSuggestionInput - The input type for the suggestClue function.
 * - ClueSuggestionOutput - The return type for the suggestClue function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ClueSuggestionInputSchema = z.object({
  word: z.string().describe('The word for which to suggest a clue.'),
});
export type ClueSuggestionInput = z.infer<typeof ClueSuggestionInputSchema>;

const ClueSuggestionOutputSchema = z.object({
  clue: z.string().describe('A suggested crossword clue for the given word.'),
});
export type ClueSuggestionOutput = z.infer<typeof ClueSuggestionOutputSchema>;

export async function suggestClue(input: ClueSuggestionInput): Promise<ClueSuggestionOutput> {
  return suggestClueFlow(input);
}

const prompt = ai.definePrompt({
  name: 'clueSuggestionPrompt',
  input: {schema: ClueSuggestionInputSchema},
  output: {schema: ClueSuggestionOutputSchema},
  prompt: `You are a crossword puzzle expert. Your job is to create clever and interesting crossword puzzle clues for a given word.

Word: {{{word}}}

Clue: `,
});

const suggestClueFlow = ai.defineFlow(
  {
    name: 'suggestClueFlow',
    inputSchema: ClueSuggestionInputSchema,
    outputSchema: ClueSuggestionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
