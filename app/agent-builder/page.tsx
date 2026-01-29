'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AgentBuilderRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new settings page with AP Automation tab
    router.replace('/settings?tab=ap-automation');
  }, [router]);

  // Show nothing while redirecting
  return null;
}
