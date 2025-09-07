
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// This page is now a directory route /play/[puzzleId], so this is a redirect.
export default function PlayRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/community');
  }, [router]);

  return null;
}
