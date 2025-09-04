
'use client';

import { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { app, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { LoaderCircle } from 'lucide-react';

export default function ProfilePage() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const auth = getAuth(app);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setDisplayName(currentUser.displayName || '');
        setEmail(currentUser.email || '');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleUpdateProfile = async () => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Error', description: 'You are not logged in.' });
      return;
    }
    
    setIsSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(user, { displayName });

      // Update Firestore user document
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { displayName }, { merge: true });

      toast({ title: 'Profile Updated', description: 'Your display name has been successfully updated.' });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Profile</h2>
        <p className="text-muted-foreground">
          This is your profile page. You can view and update your information here.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Public Profile</CardTitle>
          <CardDescription>
            This information may be displayed publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input 
              id="displayName" 
              placeholder="Enter your display name" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={isSaving}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} disabled />
          </div>
           <Button onClick={handleUpdateProfile} disabled={isSaving}>
            {isSaving ? <LoaderCircle className="animate-spin" /> : 'Update Profile'}
           </Button>
        </CardContent>
      </Card>
    </div>
  );
}
