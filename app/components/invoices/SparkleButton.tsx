'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface SparkleButtonProps {
  onClick: () => void;
  hasRule?: boolean;
}

export function SparkleButton({ onClick, hasRule = false }: SparkleButtonProps) {
  return (
    <Tooltip.Provider>
      <Tooltip.Root delayDuration={200}>
        <Tooltip.Trigger asChild>
          <button
            onClick={onClick}
            className="sparkle-button p-1 text-gray-900 rounded transition-all duration-200 group"
            title={hasRule ? "View conversion rule" : "Apply rule"}
          >
            <span className="sparkle-icon-wrapper">
              <Sparkles className="h-4 w-4" />
            </span>
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            style={{ zIndex: 9999 }}
            className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-md"
            sideOffset={5}
          >
            {hasRule ? "View conversion rule" : "Apply rule"}
            <Tooltip.Arrow className="fill-gray-900" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>

      <style jsx global>{`
        .sparkle-button {
          position: relative;
        }

        .sparkle-icon-wrapper {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: currentColor;
        }

        .sparkle-button:hover .sparkle-icon-wrapper {
          background: linear-gradient(135deg, #d8b4fe 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .sparkle-button:hover .sparkle-icon-wrapper svg {
          filter: drop-shadow(0 0 6px rgba(124, 58, 237, 0.3));
        }

        .sparkle-button:hover {
          transform: scale(1.05);
        }
      `}</style>
    </Tooltip.Provider>
  );
}
