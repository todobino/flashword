'use server';

/**
 * @fileOverview A flow for generating a crossword puzzle theme, including a title and answers.
 *
 * - generateTheme - A function that generates a theme based on a description and grid constraints.
 * - ThemeGenerationInput - The input type for the generateTheme function.
 * - ThemeGenerationOutput - The return type for the generateTheme function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ThemeAnswerSchema = z.object({
  number: z.number().describe('The clue number.'),
  direction: z.enum(['across', 'down']).describe('The direction of the answer.'),
  length: z.number().describe('The length of the answer word.'),
});

const ThemeGenerationInputSchema = z.object({
  description: z.string().describe('A description of the desired theme for the puzzle.'),
  answers: z.array(ThemeAnswerSchema).describe('An array of the available theme answer slots in the grid.'),
});
export type ThemeGenerationInput = z.infer<typeof ThemeGenerationInputSchema>;

const ThemeGenerationOutputSchema = z.object({
  title: z.string().describe('A creative and fitting title for the crossword puzzle theme.'),
  themeAnswers: z.array(z.object({
    number: z.number(),
    direction: z.enum(['across', 'down']),
    word: z.string(),
  })).describe('The generated theme answers that fit the length and direction constraints.'),
});
export type ThemeGenerationOutput = z.infer<typeof ThemeGenerationOutputSchema>;

export async function generateTheme(input: ThemeGenerationInput): Promise<ThemeGenerationOutput> {
  return themeGenerationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'themeGenerationPrompt',
  input: {schema: ThemeGenerationInputSchema},
  output: {schema: ThemeGenerationOutputSchema},
  prompt: `You are a professional crossword puzzle constructor. Your task is to brainstorm a theme for a puzzle based on a user's description and the grid's structural constraints.

You need to generate:
1. A clever and catchy puzzle title.
2. A set of theme answers that match the provided lengths and clue numbers.

The theme should be consistent, interesting, and appropriate for a general audience. The answers must be real words or well-known phrases.

Theme Description:
{{{description}}}

Available Theme Answer Slots:
{{#each answers}}
- {{number}} {{direction}} ({{length}} letters)
{{/each}}

Based on the description and the slots, generate a suitable title and a complete set of theme answers. Ensure each generated word perfectly matches its required length.
`,
});

const themeGenerationFlow = ai.defineFlow(
  {
    name: 'themeGenerationFlow',
    inputSchema: ThemeGenerationInputSchema,
    outputSchema: ThemeGenerationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
