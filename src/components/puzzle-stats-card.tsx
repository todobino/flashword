
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface PuzzleStatsCardProps {
    title: string;
    status: 'draft' | 'published';
}

export function PuzzleStatsCard({ title, status }: PuzzleStatsCardProps) {

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Puzzle Stats</CardTitle>
        <CardDescription>
            Information and analysis of your puzzle.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
            <h4 className="font-semibold">Details</h4>
            <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Title</span>
                <span className="font-medium truncate">{title || "Untitled Puzzle"}</span>
            </div>
             <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Status</span>
                {status === 'draft' ? (
                  <Badge variant="outline" className="text-orange-600 border-orange-600/50 bg-orange-50 dark:bg-orange-900/20">Draft</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-600/50 bg-green-50 dark:bg-green-900/20">Published</Badge>
                )}
            </div>
        </div>
        
        <Separator />

      </CardContent>
    </Card>
  );
}
