'use client';

import React from 'react';
import Link from 'next/link';
import { Mail, ExternalLink } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface HelpdeskPillProps {
  ticketRef: string | null;
  className?: string;
}

export function HelpdeskPill({ ticketRef, className = '' }: HelpdeskPillProps) {
  if (!ticketRef) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Link
            href="/helpdesk"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-full text-xs font-medium transition-colors ${className}`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>{ticketRef}</span>
            <ExternalLink className="h-3 w-3 opacity-60" />
          </Link>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            View helpdesk ticket
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

// Compact version for use in tight spaces
export function HelpdeskPillCompact({ ticketRef, className = '' }: HelpdeskPillProps) {
  if (!ticketRef) {
    return null;
  }

  return (
    <Tooltip.Provider>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <Link
            href="/helpdesk"
            className={`inline-flex items-center gap-1 px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-xs font-medium transition-colors ${className}`}
          >
            <Mail className="h-3 w-3" />
            <span className="font-mono">{ticketRef.split('-').pop()}</span>
          </Link>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-50 overflow-hidden rounded-md bg-gray-900 text-white px-3 py-1.5 text-xs shadow-md animate-in fade-in-0 zoom-in-95"
            sideOffset={5}
          >
            Helpdesk: {ticketRef}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}