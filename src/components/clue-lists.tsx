
'use client';

import { useState } from 'react';
import { Wand2, LoaderCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Entry } from '@/lib/types';
import { suggestClueAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

interface ClueListsProps {
  clues: {
    across: Entry[];
    down: Entry[];
  };
  selectedClue: { number: number; direction: 'across' | 'down' } | null;
  onSelectClue: (clue: { number: number; direction: 'across' | 'down' }) => void;
  onClueTextChange: (number: number, direction: 'across' | 'down', text: string) => void;
  getWordFromGrid: (clue: { number: number; direction: 'across' | 'down' }) => string;
  onWordChange: (clue: Entry, word: string) => void;
}

export function ClueLists({
  clues,
  selectedClue,
  onSelectClue,
  onClueTextChange,
  getWordFromGrid,
  onWordChange,
}: ClueListsProps) {
  const [aiLoadingClue, setAiLoadingClue] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuggestClue = async (clue: Entry) => {
    const loadingKey = `${clue.number}-${clue.direction}`;
    setAiLoadingClue(loadingKey);
    const word = getWordFromGrid(clue).replace(/_/g, '');

    if (word.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Word too short',
        description: 'Please fill in more letters for a better suggestion.',
      });
      setAiLoadingClue(null);
      return;
    }

    const result = await suggestClueAction({ word });
    if (result.success && result.data) {
      onClueTextChange(clue.number, clue.direction, result.data.clue);
      toast({
        title: `Clue suggested for "${word}"`,
        description: result.data.clue,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Suggestion Failed',
        description: result.error,
      });
    }
    setAiLoadingClue(null);
  };

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
              className={cn(
                'p-3 rounded-lg transition-colors',
                isSelected ? 'bg-yellow-100/80 dark:bg-yellow-900/40' : 'bg-card'
              )}
            >
              <div className="flex gap-3 items-start">
                <div className="font-bold text-sm text-muted-foreground mt-2">{clue.number}.</div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={`Enter ${clue.length}-letter answer...`}
                    maxLength={clue.length}
                    value={currentAnswer.replace(/_/g, '')}
                    onChange={(e) => onWordChange(clue, e.target.value)}
                    className="font-mono uppercase tracking-widest"
                    onFocus={() => onSelectClue({ number: clue.number, direction })}
                  />
                  <Textarea
                    placeholder={`Enter clue...`}
                    value={clue.clue}
                    onFocus={() => onSelectClue({ number: clue.number, direction })}
                    onChange={(e) => onClueTextChange(clue.number, direction, e.target.value)}
                    className="bg-background focus-visible:ring-primary"
                    rows={2}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSuggestClue(clue)}
                    disabled={aiLoadingClue === loadingKey}
                    className="text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    {aiLoadingClue === loadingKey ? (
                      <LoaderCircle className="w-4 h-4 animate-spin" />
                    ) : (
                      <Wand2 className="w-4 h-4" />
                    )}
                    <span className="ml-2">Suggest</span>
                  </Button>
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
    <Tabs defaultValue="across" className="h-full flex flex-col bg-card rounded-xl shadow-sm overflow-hidden">
      <TabsList className="grid w-full grid-cols-2 rounded-none">
        <TabsTrigger value="across">Across</TabsTrigger>
        <TabsTrigger value="down">Down</TabsTrigger>
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
