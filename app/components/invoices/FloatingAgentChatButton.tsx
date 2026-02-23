'use client';

import { MessageSquarePlus } from 'lucide-react';

interface FloatingAgentChatButtonProps {
  onClick: () => void;
}

export function FloatingAgentChatButton({ onClick }: FloatingAgentChatButtonProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-purple-900 hover:bg-purple-800 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 flex items-center justify-center group"
      aria-label="Create Agent"
    >
      <MessageSquarePlus className="h-6 w-6 transition-transform group-hover:scale-110" />
    </button>
  );
}
