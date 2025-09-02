export interface Cell {
  row: number;
  col: number;
  isBlack: boolean;
  char: string;
  number: number | null;
}

export type Grid = Cell[][];

export interface Clue {
  number: number;
  direction: 'across' | 'down';
  text: string;
  row: number;
  col: number;
  length: number;
}

export interface Puzzle {
  grid: Grid;
  clues: {
    across: Clue[];
    down: Clue[];
  };
  size: number;
}
