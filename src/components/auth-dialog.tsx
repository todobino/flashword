
'use client';

import { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('login');
  const { toast } = useToast();
  const auth = getAuth(app);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: 'Login successful!', description: 'Welcome back.' });
      onOpenChange(false);
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid credentials. Please check your email or password.');
      } else if (err.code === 'auth/user-not-found') {
        setError('No account found with this email. Please register instead.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      toast({ title: 'Account created!', description: 'You have been successfully registered and logged in.' });
      onOpenChange(false);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. It should be at least 6 characters long.');
      } else {
        setError(err.message || 'An unexpected error occurred during registration.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const resetForm = () => {
      setEmail('');
      setPassword('');
      setError(null);
      setIsLoading(false);
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetForm();
    }
    onOpenChange(isOpen);
  };
  
  const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      resetForm();
  }

  const renderFormContent = (isLogin: boolean) => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={isLogin ? 'email-login' : 'email-register'}>Email</Label>
        <Input
          id={isLogin ? 'email-login' : 'email-register'}
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={isLogin ? 'password-login' : 'password-register'}>Password</Label>
        <Input
          id={isLogin ? 'password-login' : 'password-register'}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />
      </div>
      {error && <p className="text-sm text-center text-destructive">{error}</p>}
      <div className="pt-2">
        <Button
          type="submit"
          onClick={isLogin ? handleLogin : handleRegister}
          disabled={isLoading || !email || !password}
          className="w-full"
        >
          {isLoading ? <LoaderCircle className="animate-spin" /> : (isLogin ? 'Login' : 'Register')}
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Authentication</DialogTitle>
        </DialogHeader>
        <div className="p-6 pb-2">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
        <div className="p-6 pt-0">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsContent value="login" className="pt-4 m-0">
                    {renderFormContent(true)}
                </TabsContent>
                <TabsContent value="register" className="pt-4 m-0">
                    {renderFormContent(false)}
                </TabsContent>
            </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
