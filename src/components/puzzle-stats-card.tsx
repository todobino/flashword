
'use client';

import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PuzzleStats } from "@/hooks/use-crossword";
import { format } from 'date-fns';
import { Button } from "./ui/button";

interface PuzzleStatsCardProps {
    title: string;
    status: 'draft' | 'published';
    stats: PuzzleStats;
    author: string;
    createdAt?: Date;
    onPreview: () => void;
}

export function PuzzleStatsCard({ title, status, stats, author, createdAt, onPreview }: PuzzleStatsCardProps) {
  
  const getDifficultyBadge = () => {
    switch (stats.difficulty) {
      case 'Easy':
        return <Badge variant="outline" className="text-green-600 border-green-600/50 bg-green-50 dark:bg-green-900/20">Easy</Badge>;
      case 'Challenging':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600/50 bg-yellow-50 dark:bg-yellow-900/20">Challenging</Badge>;
      case 'Hard':
        return <Badge variant="outline" className="text-red-600 border-red-600/50 bg-red-50 dark:bg-red-900/20">Hard</Badge>;
      default:
         return <Badge variant="outline">Medium</Badge>;
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle>Puzzle Stats</CardTitle>
        </div>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={onPreview}>
                  <Eye className="h-4 w-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Preview</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger className="w-full">
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-muted-foreground">Answers</span>
                        <span className="font-medium">{stats.answersCompletion.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={stats.answersCompletion} 
                      aria-label={`${stats.answersCompletion.toFixed(0)}% answers complete`} 
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{stats.filledSquares} of {stats.totalSquares} squares filled</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
                <Tooltip>
                <TooltipTrigger className="w-full">
                    <div className="flex justify-between items-center text-sm mb-1">
                        <span className="text-muted-foreground">Clues</span>
                        <span className="font-medium">{stats.cluesCompletion.toFixed(0)}%</span>
                    </div>
                    <Progress 
                      value={stats.cluesCompletion} 
                      aria-label={`${stats.cluesCompletion.toFixed(0)}% clues complete`}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>{stats.filledClues} of {stats.totalClues} clues written</p>
                </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>

        <Separator />
        
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
            <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Author</span>
                <span className="font-medium truncate">{author}</span>
            </div>
             <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium truncate">{createdAt ? format(createdAt, 'MM/dd/yyyy') : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                <span className="text-muted-foreground">Difficulty</span>
                {getDifficultyBadge()}
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
