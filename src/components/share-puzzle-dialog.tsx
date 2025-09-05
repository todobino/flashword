
'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Download, Copy, Check } from 'lucide-react';

interface SharePuzzleDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  puzzleId?: string;
}

export function SharePuzzleDialog({ isOpen, onOpenChange, puzzleId }: SharePuzzleDialogProps) {
  const [playUrl, setPlayUrl] = useState('');
  const [hasCopied, setHasCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (puzzleId && typeof window !== 'undefined') {
      setPlayUrl(`${window.location.origin}/play/${puzzleId}`);
    }
  }, [puzzleId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(playUrl).then(() => {
      setHasCopied(true);
      toast({ title: 'Link copied to clipboard!' });
      setTimeout(() => setHasCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({ variant: 'destructive', title: 'Copy failed', description: 'Could not copy link to clipboard.' });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share Your Puzzle</DialogTitle>
          <DialogDescription>
            Your puzzle is published! Share it with the world.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 pt-4">
            <div className="space-y-2">
                <Label>Download</Label>
                <Button variant="outline" className="w-full" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Download as PDF (Coming Soon)
                </Button>
            </div>
            <div className="space-y-2">
                <Label htmlFor="play-url">Shareable Link</Label>
                <div className="flex items-center gap-2">
                    <Input id="play-url" value={playUrl} readOnly />
                    <Button variant="outline" size="icon" onClick={handleCopy}>
                        {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

