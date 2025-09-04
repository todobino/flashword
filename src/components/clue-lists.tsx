
'use client';

import { useEffect, useState, useRef } from 'react';
import { ArrowRightCircle, ArrowDownCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type { Entry } from '@/lib/types';

interface ClueListsProps {
  clues: {
    across: Entry[];
    down: Entry[];
  };
  selectedClue: { number: number; direction: 'across' | 'down' } | null;
  onSelectClue: (clue: { number: number; direction: 'across' | 'down' }) => void;
  onClueTextChange: (number: number, direction: 'across' | 'down', text: string) => void;
  getWordFromGrid: (clue: { number: number; direction: 'across' | 'down' }) => string;
}

export function ClueLists({
  clues,
  selectedClue,
  onSelectClue,
  onClueTextChange,
  getWordFromGrid,
}: ClueListsProps) {
  const [activeTab, setActiveTab] = useState<'across' | 'down'>('across');
  const clueRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  useEffect(() => {
    if (selectedClue) {
      setActiveTab(selectedClue.direction);
      const clueKey = `${selectedClue.number}-${selectedClue.direction}`;
      // Timeout to allow tab content to render before scrolling
      setTimeout(() => {
        const clueElement = clueRefs.current.get(clueKey);
        if (clueElement) {
          clueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  }, [selectedClue]);


  const renderClueList = (direction: 'across' | 'down') => (
    <ScrollArea className="h-full">
      <div className="space-y-4 p-1">
        {clues[direction].map((clue) => {
          const isSelected = selectedClue?.number === clue.number && selectedClue?.direction === direction;
          const loadingKey = `${clue.number}-${direction}`;
          const currentAnswer = getWordFromGrid(clue);
          return (
            <div
              key={loadingKey}
              ref={(el) => clueRefs.current.set(loadingKey, el)}
              className={cn(
                'p-3 rounded-lg transition-colors',
                isSelected ? 'bg-orange-100/80 dark:bg-orange-900/40' : 'bg-card'
              )}
            >
              <div className="flex gap-3 items-start">
                <div className="font-bold text-sm text-muted-foreground mt-2">{clue.number}.</div>
                <div className="flex-1 space-y-2">
                  <div
                    className="font-mono uppercase tracking-widest text-lg cursor-text py-2"
                    tabIndex={0}
                    onFocus={() => onSelectClue({ number: clue.number, direction })}
                  >
                     {currentAnswer.split('').join(' ')}
                  </div>
                  <Textarea
                    placeholder={`Enter clue...`}
                    value={clue.clue}
                    onFocus={() => onSelectClue({ number: clue.number, direction })}
                    onChange={(e) => onClueTextChange(clue.number, direction, e.target.value)}
                    className="bg-background focus-visible:ring-primary"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          );
        })}
        {clues[direction].length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            No {direction} clues yet. Start building your grid!
          </div>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'across' | 'down')} className="h-full flex flex-col bg-card rounded-xl shadow-sm border overflow-hidden">
      <TabsList className="grid w-full grid-cols-2 rounded-none bg-primary/10 p-2">
        <TabsTrigger value="across">
          Across <ArrowRightCircle className="h-4 w-4 ml-2" />
        </TabsTrigger>
        <TabsTrigger value="down">
          Down <ArrowDownCircle className="h-4 w-4 ml-2" />
        </TabsTrigger>
      </TabsList>
      <div className="flex-1 overflow-hidden">
        <TabsContent value="across" className="h-full m-0">
          {renderClueList('across')}
        </TabsContent>
        <TabsContent value="down" className="h-full m-0">
          {renderClueList('down')}
        </TabsContent>
      </div>
    </Tabs>
  );
}
