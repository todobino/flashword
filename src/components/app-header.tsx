
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { Share2, LogIn, Grid2x2, Play, Users, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '@/components/icons';
import { AccountDropdown } from './account-dropdown';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { useToast } from '@/hooks/use-toast';
import { app } from '@/lib/firebase';
import { AuthDialog } from './auth-dialog';
import { SharePuzzleDialog } from './share-puzzle-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

type AppHeaderProps = 
  | { variant: 'editor'; title: string; onTitleChange: (t: string) => void; puzzleId: string; slug?: string; status: 'draft' | 'published'; onPublish: () => void; canPublish: boolean; saveStatus: React.ReactNode; }
  | { variant: 'player'; puzzleTitle: string; puzzleAuthor: string; }
  | { variant: 'default'; };

export function AppHeader(props: AppHeaderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const auth = getAuth(app);
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  
  const renderTitle = () => {
    switch (props.variant) {
        case 'editor':
            return (
                <div className="flex items-center gap-4">
                    <Input
                        placeholder="Untitled Puzzle"
                        className="w-72 text-lg font-semibold"
                        value={props.title}
                        onChange={(e) => props.onTitleChange(e.target.value)}
                    />
                    {props.saveStatus}
                </div>
            )
        case 'player':
            return (
                <div>
                    <h1 className="text-xl font-bold">{props.puzzleTitle}</h1>
                    <p className="text-sm text-muted-foreground">by {props.puzzleAuthor}</p>
                </div>
            )
        default:
            return (
                 <h1 className="text-xl font-bold tracking-tight text-primary">FlashWord</h1>
            )
    }
  }

  const renderActions = () => {
      if (props.variant !== 'editor') return null;

      return (
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                  {props.status === 'published' && props.slug && (
                      <Button variant="outline" size="sm" asChild>
                          <Link href={`/play/${props.slug}`}>
                              <Play className="h-4 w-4" />
                              <span className="sr-only sm:not-sr-only sm:ml-2">Play</span>
                          </Link>
                      </Button>
                  )}
                  <Button variant="outline" size="sm" title="Share puzzle" onClick={() => setIsShareOpen(true)} disabled={props.status === 'draft'}>
                      <Share2 className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-2">Share</span>
                  </Button>
                  {props.status === 'draft' && (
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <div className="inline-block">
                                      <Button size="sm" onClick={() => setIsPublishDialogOpen(true)} disabled={!props.canPublish}>
                                          <Rocket className="mr-2 h-4 w-4" />
                                          Publish
                                      </Button>
                                  </div>
                              </TooltipTrigger>
                              {!props.canPublish && (
                                  <TooltipContent>
                                      <p>Fill all answers and clues to publish.</p>
                                  </TooltipContent>
                              )}
                          </Tooltip>
                      </TooltipProvider>
                  )}
              </div>
               <Separator orientation="vertical" className="h-6" />
          </div>
      )
  }

  return (
      <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b bg-card p-4">
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                  <Link href="/home">
                      <LogoIcon className="h-8 w-8 text-primary" />
                  </Link>
                  {renderTitle()}
              </div>
          </div>
          <div className="flex items-center gap-2">
              {renderActions()}

              {user ? (
                  <>
                      <Button variant="outline" size="sm" asChild>
                          <Link href="/community">
                              <Users className="mr-2 h-4 w-4" />
                              Community
                          </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                          <Link href="/home">
                              <Grid2x2 className="mr-2 h-4 w-4" />
                              My Puzzles
                          </Link>
                      </Button>
                      <AccountDropdown user={user} />
                  </>
              ) : (
                  <Button size="sm" onClick={() => setIsAuthDialogOpen(true)} title="Login / Sign Up" variant="default">
                      <LogIn className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-2">Login / Sign Up</span>
                  </Button>
              )}
          </div>
           <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
           {props.variant === 'editor' && (
            <>
                <AlertDialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                    <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to publish?</AlertDialogTitle>
                        <AlertDialogDescription>
                        Once published, your puzzle will be publicly accessible and you will not be able to make major edits to the grid layout. You can still edit clues.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={props.onPublish}>Publish</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <SharePuzzleDialog 
                    isOpen={isShareOpen} 
                    onOpenChange={setIsShareOpen}
                    puzzleSlug={props.slug}
                />
            </>
           )}
      </header>
  );
}
