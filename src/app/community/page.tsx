
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import type { PlayablePuzzle, PuzzleDoc } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { AppHeader } from '@/components/app-header';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

async function getPublishedPuzzlesAction(): Promise<{ success: boolean, data?: PlayablePuzzle[], error?: string }> {
    try {
        const puzzlesRef = collection(db, 'puzzles');
        const q = query(puzzlesRef, where('status', '==', 'published'), orderBy('publishedAt', 'desc'), limit(12));
        const querySnapshot = await getDocs(q);
        
        const puzzles = querySnapshot.docs.map(doc => {
            const data = doc.data() as PuzzleDoc;
            return {
                id: doc.id,
                title: data.title,
                size: data.size,
                author: data.author,
                createdAt: data.publishedAt.toDate(),
                grid: data.grid, // For preview on the card
                entries: [], // Not needed for listing
                slug: data.slug,
            };
        });
        
        return { success: true, data: puzzles };
    } catch (error) {
        console.error("Error fetching published puzzles: ", error);
        return { success: false, error: 'Failed to fetch published puzzles.' };
    }
}


export default function CommunityPage() {
  const [puzzles, setPuzzles] = useState<PlayablePuzzle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPuzzles = async () => {
      setIsLoading(true);
      const { data, error } = await getPublishedPuzzlesAction();
      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch published puzzles.' });
      } else if (data) {
        setPuzzles(data);
      }
      setIsLoading(false);
    };

    fetchPuzzles();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <LoaderCircle className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading community puzzles...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader variant="default" />

      <main className="flex-1 p-4 sm:p-6 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Community Puzzles</h2>
          </div>

          {puzzles.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {puzzles.map(p => p.slug && (
                <Link key={p.id} href={`/play/${p.slug}`} className="group">
                    <Card className="hover:shadow-md hover:border-primary/50 transition-all flex flex-col h-full">
                    <CardHeader className="flex-1 pb-4">
                        {p.grid && p.size && (
                            <div 
                                className="aspect-square w-full bg-muted/20 rounded-md p-1.5 mb-4 border"
                            >
                                <div className="grid w-full h-full" style={{ gridTemplateColumns: `repeat(${p.size}, 1fr)`}}>
                                    {(p.grid as string[]).flat().join('').split('').map((cell, i) => (
                                        <div key={i} className={cn(
                                            'aspect-square',
                                            cell === '#' ? 'bg-primary' : 'bg-background'
                                        )} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <CardTitle className="truncate">{p.title || 'Untitled Puzzle'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                        <span>by {p.author}</span>
                        {p.createdAt && <span>{format(new Date(p.createdAt), 'MMM d, yyyy')}</span>}
                        </div>
                    </CardContent>
                    </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center border-2 border-dashed rounded-lg p-12">
              <h3 className="text-xl font-medium">No Puzzles Published Yet</h3>
              <p className="mt-2 text-muted-foreground">Check back later for new crossword puzzles to solve.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
