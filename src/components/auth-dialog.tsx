'use client';

import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
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
import { LoaderCircle, User } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type AuthStep = 'initial' | 'loading' | 'login' | 'signup';

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<AuthStep>('initial');
  const { toast } = useToast();
  const auth = getAuth(app);

  const handleEmailCheck = async () => {
    setIsLoading(true);
    setError(null);
    setStep('loading');
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      if (methods.length > 0) {
        setStep('login');
      } else {
        setStep('signup');
      }
    } catch (err: any) {
       setError(err.message);
       setStep('initial');
    } finally {
      setIsLoading(false);
    }
  }

  const handleAuth = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (step === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
        toast({ title: 'Account created!', description: 'You have been logged in.' });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: 'Login successful!', description: 'Welcome back.' });
      }
      onOpenChange(false);
    } catch (err: any) {
        if (err.code === 'auth/invalid-credential') {
            setError('Invalid credentials. Please check your email or password.');
        } else {
            setError(err.message);
        }
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetFlow = () => {
      setEmail('');
      setPassword('');
      setError(null);
      setStep('initial');
  }
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetFlow();
    }
    onOpenChange(isOpen);
  }

  const renderContent = () => {
    if (step === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center space-y-4 pt-4 min-h-[150px]">
          <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Finding Account...</p>
        </div>
      );
    }

    if (step === 'login' || step === 'signup') {
      return (
        <div className="space-y-4 pt-4">
           <DialogHeader>
            <DialogTitle>{step === 'login' ? 'Welcome Back!' : 'Welcome to FlashWord!'}</DialogTitle>
            <DialogDescription className="flex items-center justify-start gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{email}</span>
            </DialogDescription>
          </DialogHeader>
           <div className="space-y-2">
            <Label htmlFor="password">
              {step === 'login' ? 'Password' : 'Choose Password'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive text-center col-span-4">{error}</p>}
           <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={handleAuth}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading && <LoaderCircle className="animate-spin" />}
                {step === 'login' ? 'Login' : 'Register'}
              </Button>
            </div>
        </div>
      );
    }

    // Initial step
    return (
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="email-initial">
              Email
            </Label>
            <Input
              id="email-initial"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="you@example.com"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive text-center col-span-4">{error}</p>}
          <div className="flex justify-end pt-4">
              <Button
                type="button"
                onClick={handleEmailCheck}
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading && <LoaderCircle className="animate-spin" />}
                Check Email
              </Button>
            </div>
        </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {step === 'initial' && (
            <DialogHeader>
            <DialogTitle>Authenticate</DialogTitle>
            <DialogDescription>
                Enter your email to log in or create an account.
            </DialogDescription>
            </DialogHeader>
        )}
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
