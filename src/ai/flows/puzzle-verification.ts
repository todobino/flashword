'use server';

/**
 * @fileOverview A flow for verifying a crossword puzzle for correctness.
 *
 * - verifyPuzzle - A function that checks a puzzle's grid, clues, and answers.
 * - VerifyPuzzleInput - The input type for the verifyPuzzle function.
 * - VerifyPuzzleOutput - The return type for the verifyPuzzle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyPuzzleInputSchema = z.object({
  puzzleGrid: z.array(z.array(z.string())).describe('The crossword grid layout, with "." for black squares and letters or spaces for white squares.'),
  acrossClues: z.record(z.string()).describe('A map of across clue numbers to their text.'),
  downClues: z.record(z.string()).describe('A map of down clue numbers to their text.'),
  answers: z.record(z.string()).describe('A map of "number direction" (e.g., "1 across") to the filled-in answer word from the grid.'),
});
export type VerifyPuzzleInput = z.infer<typeof VerifyPuzzleInputSchema>;

const VerifyPuzzleOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the puzzle is valid or not.'),
  errors: z.array(z.string()).describe('A list of errors found in the puzzle. Empty if the puzzle is valid.'),
});
export type VerifyPuzzleOutput = z.infer<typeof VerifyPuzzleOutputSchema>;

export async function verifyPuzzle(input: VerifyPuzzleInput): Promise<VerifyPuzzleOutput> {
  return verifyPuzzleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'puzzleVerificationPrompt',
  input: {schema: VerifyPuzzleInputSchema},
  output: {schema: VerifyPuzzleOutputSchema},
  prompt: `You are a crossword puzzle verification expert. Your job is to analyze a given puzzle and determine if it is valid.

Here are the rules for a valid puzzle:
1. All answers must match their corresponding clues.
2. The filled grid must be consistent with all across and down answers.
3. Every letter must be part of both an "across" word and a "down" word.
4. Clues and answers should be of reasonable quality for a standard crossword.

You will be given the grid, the clues, and the proposed answers. Identify all errors and inconsistencies. If there are no errors, the puzzle is valid.

Grid:
{{jsonStringify puzzleGrid}}

Across Clues:
{{jsonStringify acrossClues}}

Down Clues:
{{jsonStringify downClues}}

Answers from Grid:
{{jsonStringify answers}}

Analyze the puzzle and provide your verification result. List all specific errors found. If an answer doesn't make sense for a clue, that is an error. If a filled square in the grid is incorrect for either the across or down word, that is an error.
`,
});

const verifyPuzzleFlow = ai.defineFlow(
  {
    name: 'verifyPuzzleFlow',
    inputSchema: VerifyPuzzleInputSchema,
    outputSchema: VerifyPuzzleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
