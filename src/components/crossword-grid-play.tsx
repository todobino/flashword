
'use client';

import { useRef, useEffect, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { Grid, Entry, Direction } from '@/lib/types';

interface CrosswordGridPlayProps {
  grid: Grid;
  size: number;
  onCharChange: (row: number, col: number, char: string, direction?: Direction) => void;
  selectedClue: { number: number; direction: 'across' | 'down' } | null;
  currentClueDetails: Entry | null;
  onSelectClue: (clue: Entry) => void;
  clues: { across: Entry[], down: Entry[] };
  focusedCell: {row: number, col: number} | null;
  setFocusedCell: (cell: {row: number, col: number} | null) => void;
}

export function CrosswordGridPlay({
  grid,
  size,
  onCharChange,
  selectedClue,
  currentClueDetails,
  onSelectClue,
  clues,
  focusedCell,
  setFocusedCell
}: CrosswordGridPlayProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);

  useEffect(() => {
    inputRefs.current = Array(size).fill(null).map(() => Array(size).fill(null));
  }, [size]);

  useEffect(() => {
    if (focusedCell) {
        inputRefs.current[focusedCell.row]?.[focusedCell.col]?.focus();
    }
  }, [focusedCell]);

  
  const findCluesForCell = (row: number, col: number) => {
    const allClues = [...clues.across, ...clues.down];
    
    const acrossClue = allClues.find(c => 
        c.direction === 'across' && 
        c.row === row && 
        col >= c.col && 
        col < c.col + c.length
    );
    
    const downClue = allClues.find(c => 
        c.direction === 'down' &&
        c.col === col &&
        row >= c.row &&
        row < c.row + c.length
    );
    return { acrossClue, downClue };
  };

  const handleCellClick = (row: number, col: number) => {
    const cell = grid[row][col];
    if (cell.isBlack) return;
    
    setFocusedCell({ row, col });
    const { acrossClue, downClue } = findCluesForCell(row, col);

    if (acrossClue && downClue) {
      // If clicking the same cell, toggle direction. Otherwise, default to across.
      if (selectedClue?.id === acrossClue.id) {
        onSelectClue(downClue);
      } else {
        onSelectClue(acrossClue);
      }
    } else if (acrossClue) {
      onSelectClue(acrossClue);
    } else if (downClue) {
      onSelectClue(downClue);
    }
  };


  const handleCharChange = (row: number, col: number, char: string) => {
    onCharChange(row, col, char, selectedClue?.direction);

    // After updating the character, move to the next cell
    let nextRow = row;
    let nextCol = col;
    if (char.length > 0 && currentClueDetails) {
        const {direction, length} = currentClueDetails;
      if (direction === 'across') {
        nextCol = col + 1;
        if (nextCol >= currentClueDetails.col + length) return;
        while(nextCol < size && grid[row][nextCol].isBlack) nextCol++;
      } else {
        nextRow = row + 1;
        if (nextRow >= currentClueDetails.row + length) return;
        while(nextRow < size && grid[nextRow][col].isBlack) nextRow++;
      }

      if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size && !grid[nextRow][nextCol].isBlack) {
        setFocusedCell({ row: nextRow, col: nextCol });
      }
    }
  };
  
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    if (grid[row][col].isBlack) return;

    if (e.key === ' ') {
      e.preventDefault();
       const { acrossClue, downClue } = findCluesForCell(row, col);

       if (acrossClue && downClue) {
        if (selectedClue?.direction === 'across') {
          onSelectClue(downClue);
        } else {
          onSelectClue(acrossClue);
        }
      }
      return;
    }

    let nextRow = row;
    let nextCol = col;
    let direction = selectedClue?.direction || 'across';

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextCol = col + 1;
      direction = 'across';
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextCol = col - 1;
      direction = 'across';
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nextRow = row + 1;
      direction = 'down';
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nextRow = row - 1;
      direction = 'down';
    } else if (e.key === 'Backspace' && grid[row][col].char === '') {
        e.preventDefault();
        if (selectedClue?.direction === 'across') {
            nextCol = col - 1;
        } else {
            nextRow = row - 1;
        }
    } else {
        return; // Don't prevent default for character input
    }
    
    // Move to the next valid cell
    if (nextRow >= 0 && nextRow < size && nextCol >= 0 && nextCol < size && !grid[nextRow][nextCol].isBlack) {
        setFocusedCell({ row: nextRow, col: nextCol });
        const { acrossClue, downClue } = findCluesForCell(nextRow, nextCol);
        
        const currentDirectionClue = direction === 'across' ? acrossClue : downClue;
        const otherDirectionClue = direction === 'across' ? downClue : acrossClue;

        if (currentDirectionClue && selectedClue?.id !== currentDirectionClue.id) {
            onSelectClue(currentDirectionClue);
        } else if (otherDirectionClue && selectedClue?.id !== otherDirectionClue.id) {
                onSelectClue(otherDirectionClue);
        }
        return;
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
            const isFocused = isSelected && focusedCell?.row === rowIndex && focusedCell?.col === colIndex;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={cn(
                  'relative aspect-square border border-border flex items-center justify-center transition-colors',
                  cell.isBlack ? 'bg-primary' : 'bg-card',
                   isSelected && !cell.isBlack && 'bg-orange-200/50 dark:bg-orange-800/50',
                   isFocused && !cell.isBlack && 'bg-orange-300 dark:bg-orange-700'
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
                    onFocus={() => setFocusedCell({ row: rowIndex, col: colIndex })}
                    data-coords={`${rowIndex}-${colIndex}`}
                    type="text"
                    maxLength={1}
                    value={cell.char}
                    onChange={(e) => handleCharChange(rowIndex, colIndex, e.target.value)}
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
