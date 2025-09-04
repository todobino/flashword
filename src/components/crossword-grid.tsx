
'use client';

import { useRef, useEffect, KeyboardEvent, useState } from 'react';
import { cn } from '@/lib/utils';
import type { Grid, Clue } from '@/lib/types';

interface CrosswordGridProps {
  grid: Grid;
  size: number;
  onCellClick: (row: number, col: number) => void;
  onCharChange: (row: number, col: number, char: string) => void;
  selectedClue: { number: number; direction: 'across' | 'down' } | null;
  currentClueDetails: Clue | null;
  onSelectClue: (clue: { number: number; direction: 'across' | 'down' } | null) => void;
  designMode?: boolean;
}

export function CrosswordGrid({
  grid,
  size,
  onCellClick,
  onCharChange,
  selectedClue,
  currentClueDetails,
  onSelectClue,
  designMode = false,
}: CrosswordGridProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState<'draw' | 'erase' | null>(null);
  const [startCell, setStartCell] = useState<{ row: number, col: number } | null>(null);
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [lastPaintedCell, setLastPaintedCell] = useState<{row: number, col: number} | null>(null);


  useEffect(() => {
    inputRefs.current = Array(size).fill(null).map(() => Array(size).fill(null));
  }, [size]);

  const handleMouseDown = (row: number, col: number) => {
    if (!designMode) return;
    setIsDrawing(true);
    setStartCell({ row, col });
    setLastPaintedCell({row, col});
    const cellIsBlack = grid[row][col].isBlack;
    setDrawMode(cellIsBlack ? 'erase' : 'draw');
    onCellClick(row, col);
  };

  const handleMouseUp = () => {
    if (!designMode) return;
    setIsDrawing(false);
    setDrawMode(null);
    setStartCell(null);
    setDragDirection(null);
    setLastPaintedCell(null);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!designMode || !isDrawing || !startCell || (lastPaintedCell?.row === row && lastPaintedCell?.col === col)) return;
    
    let currentDragDirection = dragDirection;

    // Determine and lock drag direction
    if (!currentDragDirection) {
        const dRow = Math.abs(row - startCell.row);
        const dCol = Math.abs(col - startCell.col);
        if (dRow > 0 || dCol > 0) { // Check if there's any movement
            currentDragDirection = dRow > dCol ? 'vertical' : 'horizontal';
            setDragDirection(currentDragDirection);
        }
    }

    const canPaint = (currentDragDirection === 'horizontal' && row === startCell.row) ||
                     (currentDragDirection === 'vertical' && col === startCell.col);


    if (canPaint) {
        const cellIsBlack = grid[row][col].isBlack;
        if ((drawMode === 'draw' && !cellIsBlack) || (drawMode === 'erase' && cellIsBlack)) {
            onCellClick(row, col);
            setLastPaintedCell({row, col});
        }
    }
  };
  
  const handleCellClick = (row: number, col: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (designMode) {
        // This is handled by onMouseDown in design mode to initiate drawing
        return;
    }

    if (e.ctrlKey || e.metaKey) {
      onCellClick(row, col);
      return;
    }

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
    <div className={cn(
        "relative aspect-square w-full max-w-[calc(100vh-12rem)] overflow-hidden bg-card",
        !designMode && "shadow-lg"
    )} onMouseLeave={handleMouseUp}>
      <div
        className="grid absolute inset-0"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onMouseUp={handleMouseUp}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            const isSelected = selectedClue && currentClueDetails && isCellInClue(rowIndex, colIndex);
            const isFocused = isSelected && rowIndex === currentClueDetails?.row && colIndex === currentClueDetails?.col;

            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                onClick={(e) => handleCellClick(rowIndex, colIndex, e)}
                onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                className={cn(
                  'relative aspect-square border border-border flex items-center justify-center transition-colors',
                  cell.isBlack ? 'bg-primary' : 'bg-card',
                   isSelected && !cell.isBlack && 'bg-accent/20',
                   isFocused && !cell.isBlack && 'bg-accent/40',
                   designMode ? 'cursor-pointer' : 'cursor-default',
                   designMode && cell.char ? 'bg-yellow-200/50 dark:bg-yellow-800/50' : ''
                )}
              >
                {cell.number && (
                  <span className="absolute top-0 left-0.5 text-[0.5rem] font-bold text-muted-foreground select-none">
                    {cell.number}
                  </span>
                )}
                {designMode && !cell.isBlack && cell.char && (
                    <span className="text-base md:text-lg font-semibold uppercase text-foreground select-none">
                        {cell.char}
                    </span>
                )}
                {!designMode && !cell.isBlack && (
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
