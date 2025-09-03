'use client';

import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const auth = getAuth(app);

  const handleAuth = async (action: 'login' | 'signup') => {
    setIsLoading(true);
    setError(null);
    try {
      if (action === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Account created!', description: 'You have been logged in.' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login successful!', description: 'Welcome back.' });
      }
      onOpenChange(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleTabChange = () => {
    setError(null);
  }

  const renderFormContent = (action: 'login' | 'signup') => (
      <div className="space-y-4 pt-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={`email-${action}`} className="text-right">
            Email
          </Label>
          <Input
            id={`email-${action}`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="col-span-3"
            disabled={isLoading}
          />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor={`password-${action}`} className="text-right">
            Password
          </Label>
          <Input
            id={`password-${action}`}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="col-span-3"
            disabled={isLoading}
          />
        </div>
        {error && <p className="text-sm text-destructive text-center col-span-4">{error}</p>}
         <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => handleAuth(action)}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <LoaderCircle className="animate-spin" />}
              {action === 'login' ? 'Login' : 'Sign Up'}
            </Button>
          </div>
      </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Authenticate</DialogTitle>
          <DialogDescription>
            Log in or create an account to save your progress.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="login" className="w-full" onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="login">
            {renderFormContent('login')}
          </TabsContent>
          <TabsContent value="signup">
            {renderFormContent('signup')}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
