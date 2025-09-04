
'use client';

import { cn } from '@/lib/utils';
import type { Grid } from '@/lib/types';

interface CrosswordGridPreviewProps {
  grid: Grid;
  size: number;
}

export function CrosswordGridPreview({ grid, size }: CrosswordGridPreviewProps) {
  if (!grid || size === 0) {
    return <div className="aspect-square w-full bg-muted animate-pulse" />;
  }

  const fontSize =
    size <= 5 ? 'text-2xl' :
    size <= 7 ? 'text-xl' :
    size <= 10 ? 'text-lg' :
    size <= 15 ? 'text-base' :
    size <= 21 ? 'text-sm' :
    'text-xs';

  return (
    <div className="relative aspect-square w-full bg-white border-2 border-black p-1">
      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}
      >
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                'relative aspect-square border border-black/80 flex items-center justify-center',
                cell.isBlack ? 'bg-black' : 'bg-white'
              )}
            >
              {cell.number && (
                <span className="absolute top-0 left-0.5 text-[0.4rem] md:text-[0.5rem] font-sans font-bold text-black select-none">
                  {cell.number}
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
