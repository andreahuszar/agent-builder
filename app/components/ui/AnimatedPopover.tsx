'use client';

import React from 'react';

interface AnimatedPopoverProps {
  children: React.ReactNode;
  className?: string;
}

export function AnimatedPopover({ children, className = '' }: AnimatedPopoverProps) {
  return (
    <>
      <style jsx>{`
        @keyframes popoverEnter {
          0% {
            opacity: 0;
            transform: scale(0.96);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-popover-enter {
          animation: popoverEnter 250ms ease-out forwards;
        }
      `}</style>
      <div className={`animate-popover-enter ${className}`}>
        {children}
      </div>
    </>
  );
}
