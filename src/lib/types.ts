
export interface Cell {
  row: number;
  col: number;
  isBlack: boolean;
  char: string;
  number: number | null;
}

export type Grid = Cell[][];

export type Direction = 'across' | 'down';

export interface Entry {
  id: string; // "1A", "4D", etc.
  number: number;
  direction: Direction;
  row: number;
  col: number;
  length: number;
  answer: string; // UPPERCASE
  clue: string;
}

export type TemplateName = 'Classic' | 'Condensed' | 'Clear';

// This represents the client-side state of a puzzle
export interface Puzzle {
  id?: string;
  title: string;
  grid: Grid;
  clues: {
    across: Entry[];
    down: Entry[];
  };
  size: number;
  status: 'draft' | 'published';
  author: string;
  createdAt?: Date;
}

// This represents the Firestore document schema
export interface PuzzleDoc {
    id?: string;
    title: string;
    status: "draft" | "published";
    size: number;
    grid: string[]; // rows strings, use "#" for black, "." for empty
    entries: Entry[]; // all across/downs in one array
    
    // housekeeping
    createdAt: any; // serverTimestamp
    updatedAt: any; // serverTimestamp
    owner: string;
    author: string; 
}


export interface PlayablePuzzle {
    id: string;
    title: string;
    author: string;
    size: number;
    grid: string[] | Grid; // Grid for client, string[] from server
    entries: Entry[];
    createdAt: Date;
}
