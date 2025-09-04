
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Puzzle } from '@/lib/types';
import { CrosswordGridPreview } from './crossword-grid-preview';

interface PuzzlePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  puzzle: Puzzle;
}

export function PuzzlePreviewDialog({ isOpen, onOpenChange, puzzle }: PuzzlePreviewDialogProps) {
  if (!puzzle) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[calc(100vh-4rem)] p-0 flex flex-col">
        <DialogHeader className="sr-only">
          <DialogTitle>Puzzle Preview</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="p-8 space-y-8 font-serif">
                <header className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">{puzzle.title}</h1>
                    <h2 className="text-lg font-medium">@{puzzle.author}</h2>
                </header>

                <div className="grid grid-cols-2 gap-8">
                     <div className="col-span-1 space-y-6 text-sm leading-relaxed">
                        <div>
                            <h3 className="text-base font-bold tracking-wider uppercase border-b pb-2 mb-2">Across</h3>
                            <ol className="space-y-1.5 column-count-2 column-gap-6">
                            {puzzle.clues.across.map(clue => (
                                <li key={clue.id} className="break-inside-avoid">
                                    <span className="font-bold mr-2">{clue.number}.</span>
                                    {clue.clue || <span className="italic text-muted-foreground">No clue yet</span>}
                                </li>
                            ))}
                            </ol>
                        </div>
                    </div>

                    <div className="col-span-1 space-y-6">
                        <CrosswordGridPreview grid={puzzle.grid} size={puzzle.size} />
                        <div className="text-sm leading-relaxed">
                            <h3 className="text-base font-bold tracking-wider uppercase border-b pb-2 mb-2">Down</h3>
                            <ol className="space-y-1.5 column-count-2 column-gap-6">
                            {puzzle.clues.down.map(clue => (
                                <li key={clue.id} className="break-inside-avoid">
                                    <span className="font-bold mr-2">{clue.number}.</span>
                                    {clue.clue || <span className="italic text-muted-foreground">No clue yet</span>}
                                </li>
                            ))}
                            </ol>
                        </div>
                    </div>
                </div>
            </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
