'use server';

/**
 * @fileOverview Verifies if the crossword puzzle clues and answers are consistent.
 *
 * - verifyPuzzle - A function that verifies the puzzle.
 * - VerifyPuzzleInput - The input type for the verifyPuzzle function.
 * - VerifyPuzzleOutput - The return type for the verifyPuzzle function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const VerifyPuzzleInputSchema = z.object({
  puzzleGrid: z.array(z.array(z.string())).describe('The crossword puzzle grid, represented as a 2D array of strings.'),
  acrossClues: z.record(z.string(), z.string()).describe('A map of across clue numbers to their corresponding clues.'),
  downClues: z.record(z.string(), z.string()).describe('A map of down clue numbers to their corresponding clues.'),
  answers: z.record(z.string(), z.string()).describe('A map of clue numbers to their corresponding answers.'),
});
export type VerifyPuzzleInput = z.infer<typeof VerifyPuzzleInputSchema>;

const VerifyPuzzleOutputSchema = z.object({
  isValid: z.boolean().describe('Whether the puzzle is valid or not.'),
  errors: z.array(z.string()).describe('A list of errors found in the puzzle, if any.'),
});
export type VerifyPuzzleOutput = z.infer<typeof VerifyPuzzleOutputSchema>;

export async function verifyPuzzle(input: VerifyPuzzleInput): Promise<VerifyPuzzleOutput> {
  return verifyPuzzleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'verifyPuzzlePrompt',
  input: {schema: VerifyPuzzleInputSchema},
  output: {schema: VerifyPuzzleOutputSchema},
  prompt: `You are a crossword puzzle expert. Your task is to verify if the provided crossword puzzle clues and answers are consistent. If there are any inconsistencies, return them as a list of errors.

Crossword Grid:
{{#each puzzleGrid}}
  {{this}}
{{/each}}

Across Clues:
{{#each acrossClues}}
  {{@key}}: {{this}}
{{/each}}

Down Clues:
{{#each downClues}}
  {{@key}}: {{this}}
{{/each}}

Answers:
{{#each answers}}
  {{@key}}: {{this}}
{{/each}}

Determine if the clues match the answers in the grid. If not, make a list of the inconsistencies.
If the puzzle is valid, return isValid as true and an empty list for errors. If there are errors, return isValid as false and a list of the errors found in the puzzle.
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
