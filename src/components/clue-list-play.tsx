
'use client';

import { useEffect, useState, useRef } from 'react';
import { ArrowRightCircle, ArrowDownCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Entry } from '@/lib/types';

interface ClueListPlayProps {
  clues: {
    across: Entry[];
    down: Entry[];
  };
  selectedClue: Entry | null;
  onSelectClue: (clue: Entry) => void;
}

export function ClueListPlay({
  clues,
  selectedClue,
  onSelectClue,
}: ClueListPlayProps) {
  const [activeTab, setActiveTab] = useState<'across' | 'down'>('across');
  const clueRefs = useRef<Map<string, HTMLLIElement | null>>(new Map());

  // Effect to switch tab when selected clue's direction changes
  useEffect(() => {
    if (selectedClue) {
      setActiveTab(selectedClue.direction);
    }
  }, [selectedClue]);

  // Effect to scroll to the selected clue when it changes or when tab changes
  useEffect(() => {
    if (selectedClue) {
      const clueKey = `${selectedClue.number}-${selectedClue.direction}`;
      const clueElement = clueRefs.current.get(clueKey);
      if (clueElement) {
        clueElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedClue, activeTab]);


  const renderClueList = (direction: 'across' | 'down') => (
    <ScrollArea className="h-full">
        <ol className="space-y-2 p-1">
            {clues[direction].map((clue) => (
            <li
                key={clue.id}
                ref={(el) => clueRefs.current.set(`${clue.number}-${direction}`, el)}
                className={cn(
                    "p-2 rounded-md cursor-pointer transition-colors",
                    selectedClue?.id === clue.id ? 'bg-orange-100 dark:bg-orange-900/40' : 'hover:bg-muted'
                )}
                onClick={() => onSelectClue(clue)}
            >
                <span className="font-bold mr-2">{clue.number}.</span>
                <span>{clue.clue}</span>
            </li>
            ))}
        </ol>
    </ScrollArea>
  );

  return (
    <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'across' | 'down')} className="h-full flex flex-col bg-card rounded-xl shadow-sm border overflow-hidden">
      <TabsList className="grid w-full grid-cols-2 rounded-none bg-primary/10 p-2 border-b">
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
