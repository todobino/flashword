
'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { Grid, Entry } from '@/lib/types';

interface CrosswordGridEditProps {
  grid: Grid;
  size: number;
  onCharChange: (row: number, col: number, char: string) => void;
  selectedClue: { number: number; direction: 'across' | 'down' } | null;
  currentClueDetails: Entry | null;
  onSelectClue: (clue: { number: number; direction: 'across' | 'down' } | null) => void;
}

export function CrosswordGridEdit({
  grid,
  size,
  onCharChange,
  selectedClue,
  currentClueDetails,
  onSelectClue,
}: CrosswordGridEditProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    inputRefs.current = Array(size).fill(null).map(() => Array(size).fill(null));
  }, [size]);

  
  const handleCellClick = (row: number, col: number) => {
    const cell = grid[row][col];
    if (cell.isBlack) return;

    // Determine which clues pass through this cell
    let acrossClueNum: number | null = null;
    let downClueNum: number | null = null;
    
    // Find across clue
    for (let i = col; i >= 0; i--) {
        if (grid[row][i].number !== null && (i === 0 || grid[row][i-1].isBlack)) {
            acrossClueNum = grid[row][i].number;
            break;
        }
    }
    
    // Find down clue
    for (let i = row; i >= 0; i--) {
        if (grid[i][col].number !== null && (i === 0 || grid[i-1][col].isBlack)) {
            downClueNum = grid[i][col].number;
            break;
        }
    }

    if (acrossClueNum && downClueNum) {
      // Toggle between across and down if both exist
      if (selectedClue && selectedClue.number === acrossClueNum && selectedClue.direction === 'across') {
        onSelectClue({ number: downClueNum, direction: 'down' });
      } else {
        onSelectClue({ number: acrossClueNum, direction: 'across' });
      }
    } else if (acrossClueNum) {
      onSelectClue({ number: acrossClueNum, direction: 'across' });
    } else if (downClueNum) {
      onSelectClue({ number: downClueNum, direction: 'down' });
    }

    inputRefs.current[row][col]?.focus();
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (grid[row][col].isBlack) return;

    let nextRow = row;
    let nextCol = col;

    if (e.key === "ArrowRight") {
      nextCol = Math.min(size - 1, col + 1);
    } else if (e.key === "ArrowLeft") {
      nextCol = Math.max(0, col - 1);
    } else if (e.key === "ArrowDown") {
      nextRow = Math.min(size - 1, row + 1);
    } else if (e.key === "ArrowUp") {
      nextRow = Math.max(0, row - 1);
    } else if (e.key === 'Backspace' && grid[row][col].char === '') {
        if (selectedClue?.direction === 'across') {
            nextCol = Math.max(0, col - 1);
        } else {
            nextRow = Math.max(0, row - 1);
        }
    } else if (e.key.length === 1 && /[a-zA-Z]/.test(e.key)) {
        if (selectedClue?.direction === 'across') {
            nextCol = Math.min(size - 1, col + 1);
        } else {
            nextRow = Math.min(size - 1, row + 1);
        }
    }
    
    // Skip over black cells
    if (selectedClue?.direction === 'across' && (e.key === 'ArrowRight' || (e.key.length === 1 && /[a-zA-Z]/.test(e.key)))) {
        while(nextCol < size && grid[row][nextCol].isBlack) nextCol++;
    }
    if (selectedClue?.direction === 'down' && (e.key === 'ArrowDown' || (e.key.length === 1 && /[a-zA-Z]/.test(e.key)))) {
        while(nextRow < size && grid[nextRow][col].isBlack) nextRow++;
    }

    if (nextRow !== row || nextCol !== col) {
      e.preventDefault();
      inputRefs.current[nextRow]?.[nextCol]?.focus();
    }
  };

  const isCellInClue = (row: number, col: number) => {
    if (!currentClueDetails) return false;
    const { row: startRow, col: startCol, length, direction } = currentClueDetails;
    if (direction === 'across') {
      return row === startRow && col >= startCol && col < startCol + length;
    } else {
      return col === startCol && row >= startRow && row < startRow + length;
    }
  };

  return (
    <div className="relative aspect-square w-full max-w-[calc(100vh-12rem)] mx-auto overflow-hidden bg-card shadow-lg">
      <div
        className="grid absolute inset-0"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isSelected = selectedClue && currentClueDetails && isCellInClue(rowIndex, colIndex);
            const isFocused = isSelected && rowIndex === currentClueDetails?.row && colIndex === currentClueDetails?.col;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={cn(
                  'relative aspect-square border border-border flex items-center justify-center transition-colors',
                  cell.isBlack ? 'bg-primary' : 'bg-card',
                   isSelected && !cell.isBlack && 'bg-yellow-200/50 dark:bg-yellow-800/50',
                   isFocused && !cellisBlack && 'bg-yellow-300/50 dark:bg-yellow-700/50'
                )}
              >
                {cell.number && (
                  <span className="absolute top-0 left-0.5 text-[0.5rem] font-bold text-muted-foreground select-none">
                    {cell.number}
                  </span>
                )}
                {!cell.isBlack && (
                  <input
                    ref={(el) => {
                      if (inputRefs.current[rowIndex]) {
                        inputRefs.current[rowIndex][colIndex] = el;
                      }
                    }}
                    type="text"
                    maxLength={1}
                    value={cell.char}
                    onChange={(e) => onCharChange(rowIndex, colIndex, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                    className="w-full h-full p-0 text-center uppercase bg-transparent border-none outline-none text-base md:text-lg font-semibold focus:ring-0 text-foreground"
                    aria-label={`Cell ${rowIndex + 1}-${colIndex + 1}`}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
