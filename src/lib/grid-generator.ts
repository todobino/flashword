
import type { Grid } from './types';

// This file is no longer used for on-the-fly generation in the app,
// but could be kept for reference or future server-side generation tools.

function createGrid(size: number): Grid {
    return Array.from({ length: size }, (_, row) =>
        Array.from({ length: size }, (_, col) => ({
            row,
            col,
            isBlack: false,
            char: '',
            number: null,
        }))
    );
}

function isValid(grid: Grid, size: number): boolean {
    // Check for runs of white cells shorter than 3
    for (let r = 0; r < size; r++) {
        let count = 0;
        for (let c = 0; c < size; c++) {
            if (!grid[r][c].isBlack) {
                count++;
            } else {
                if (count > 0 && count < 3) return false;
                count = 0;
            }
        }
        if (count > 0 && count < 3) return false;
    }

    for (let c = 0; c < size; c++) {
        let count = 0;
        for (let r = 0; r < size; r++) {
            if (!grid[r][c].isBlack) {
                count++;
            } else {
                if (count > 0 && count < 3) return false;
                count = 0;
            }
        }
        if (count > 0 && count < 3) return false;
    }


    // Check connectivity of white squares using BFS
    const q: [number, number][] = [];
    const visited: boolean[][] = Array(size).fill(0).map(() => Array(size).fill(false));
    let firstWhiteCell: [number, number] | null = null;
    let whiteCellCount = 0;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (!grid[r][c].isBlack) {
                if (!firstWhiteCell) firstWhiteCell = [r, c];
                whiteCellCount++;
            }
        }
    }
    
    if(!firstWhiteCell) return true;
    if (whiteCellCount === 0) return true;

    q.push(firstWhiteCell);
    visited[firstWhiteCell[0]][firstWhiteCell[1]] = true;
    let visitedCount = 1;

    while (q.length > 0) {
        const [r, c] = q.shift()!;
        [[r-1,c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && !grid[nr][nc].isBlack && !visited[nr][nc]) {
                visited[nr][nc] = true;
                q.push([nr, nc]);
                visitedCount++;
            }
        });
    }

    return visitedCount === whiteCellCount;
}

// The following functions are no longer the primary method for randomization.
// They are kept for reference. The app now uses pre-generated patterns from JSON files.
export function generateGridPatterns(size: number, count: number): Grid[] {
    const patterns: Grid[] = [];
    let attempts = 0;

    while (patterns.length < count && attempts < 1000) {
        const grid = createGrid(size);
        const blackSquareCount = Math.floor(size * size * (Math.random() * 0.1 + 0.17)); // 17-27% black squares

        for (let i = 0; i < blackSquareCount / 2; i++) {
            const r = Math.floor(Math.random() * size);
            const c = Math.floor(Math.random() * size);

            if (!grid[r][c].isBlack) {
                 grid[r][c].isBlack = true;
                 grid[size - 1 - r][size - 1 - c].isBlack = true;
            }
        }
        
        if (isValid(grid, size)) {
           const gridString = JSON.stringify(grid);
           if (!patterns.some(p => JSON.stringify(p) === gridString)) {
               patterns.push(grid);
           }
        }
        attempts++;
    }

    return patterns;
}

export function generateRandomGrid(size: number): Grid {
    let attempts = 0;
    while(attempts < 50) { // Increased attempts
        const patterns = generateGridPatterns(size, 1);
        if (patterns.length > 0) {
            return patterns[0];
        }
        attempts++;
    }
    console.warn("Failed to generate a valid random grid, returning empty grid.");
    return createGrid(size); // Fallback to an empty grid
}
