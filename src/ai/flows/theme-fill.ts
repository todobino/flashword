'use server';

/**
 * @fileOverview A flow for filling crossword theme answers with random valid words.
 *
 * - fillThemeWords - A function that generates valid words for given theme slots.
 * - ThemeFillInput - The input type for the fillThemeWords function.
 * - ThemeFillOutput - The return type for the fillThemeWords function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThemeAnswerSlotSchema = z.object({
  number: z.number().describe('The clue number.'),
  direction: z.enum(['across', 'down']).describe('The direction of the answer.'),
  length: z.number().describe('The length of the answer word.'),
  row: z.number().describe('The starting row of the answer.'),
  col: z.number().describe('The starting column of the answer.'),
});

const ThemeFillInputSchema = z.object({
  answers: z.array(ThemeAnswerSlotSchema).describe('An array of the available theme answer slots in the grid.'),
  puzzleGrid: z.array(z.array(z.string())).describe('The crossword grid layout, with "." for black squares and letters or spaces for white squares. This is used to check for intersections.'),
});
export type ThemeFillInput = z.infer<typeof ThemeFillInputSchema>;

const ThemeFillOutputSchema = z.object({
    themeAnswers: z.array(z.object({
    number: z.number(),
    direction: z.enum(['across', 'down']),
    word: z.string(),
  })).describe('The generated theme answers that fit the length and direction constraints.'),
});
export type ThemeFillOutput = z.infer<typeof ThemeFillOutputSchema>;

export async function fillThemeWords(input: ThemeFillInput): Promise<ThemeFillOutput> {
  return themeFillFlow(input);
}

const prompt = ai.definePrompt({
  name: 'themeFillPrompt',
  input: {schema: z.object({
    answers: z.string(),
    puzzleGrid: z.string(),
  })},
  output: {schema: ThemeFillOutputSchema},
  prompt: `You are a professional crossword puzzle constructor. Your task is to fill in the provided theme answer slots with random, valid English words.

You need to generate:
1. A set of theme answers that are valid, single words (no spaces) and match the provided lengths.

**Crucially, the theme answers must be consistent with each other.** If any of the theme answers intersect on the grid, the letters at the intersection point MUST be the same. The words should not be related to each other in any thematic way. They should be common, non-obscure words. Do not repeat words.

Available Theme Answer Slots:
{{{answers}}}

Puzzle Grid (for intersection checking):
{{{puzzleGrid}}}

Generate a complete set of theme answers that are valid, fit the lengths, and correctly handle any intersections between them.
`,
});

const themeFillFlow = ai.defineFlow(
  {
    name: 'themeFillFlow',
    inputSchema: ThemeFillInputSchema,
    outputSchema: ThemeFillOutputSchema,
  },
  async input => {
    const {output} = await prompt({
        answers: JSON.stringify(input.answers, null, 2),
        puzzleGrid: JSON.stringify(input.puzzleGrid, null, 2),
    });
    return output!;
  }
);
