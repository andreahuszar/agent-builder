'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, MessageSquare } from 'lucide-react';

interface Comment {
  id: string;
  user: string;
  user_initials: string;
  message: string;
  timestamp: string;
  type: 'user' | 'system';
}

interface CommentsDrawerProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommentsDrawer({ invoiceId, isOpen, onClose }: CommentsDrawerProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Set mounted flag after hydration to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Load mock comments on mount
  useEffect(() => {
    if (isOpen) {
      loadMockComments();
      // Trigger animation after brief delay
      setTimeout(() => setIsVisible(true), 10);
      // Focus textarea when opened
      setTimeout(() => textareaRef.current?.focus(), 350);
    }
  }, [isOpen, invoiceId]);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const loadMockComments = () => {
    // Mock comments data
    const mockComments: Comment[] = [
      {
        id: '1',
        user: 'Sarah Chen',
        user_initials: 'SC',
        message: 'I reviewed the invoice and noticed the PO number is missing. Can you please verify with the vendor?',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'user',
      },
      {
        id: '2',
        user: 'John Smith',
        user_initials: 'JS',
        message: 'Contacted the vendor. They confirmed PO #45892 should be referenced. Updated the invoice.',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'user',
      },
      {
        id: '3',
        user: 'System',
        user_initials: 'SYS',
        message: 'Invoice status changed from "Needs Info" to "Ready to Post"',
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        type: 'system',
      },
      {
        id: '4',
        user: 'Maria Garcia',
        user_initials: 'MG',
        message: 'Great work team! This is ready for posting.',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        type: 'user',
      },
    ];
    setComments(mockComments);
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleSendComment = () => {
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: `${Date.now()}`,
      user: 'You',
      user_initials: 'YO',
      message: newComment.trim(),
      timestamp: new Date().toISOString(),
      type: 'user',
    };

    setComments([...comments, comment]);
    setNewComment('');

    // Resize textarea back to original size
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Cmd/Ctrl + Enter
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendComment();
    }
  };

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewComment(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getUserColor = (initials: string) => {
    const colors = [
      'bg-purple-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-teal-500',
    ];
    const index = initials.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!isMounted) return null;

  // Don't render at all when closed to avoid blocking interactions
  if (!isOpen && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-950">Comments</h2>
                <span className="text-sm text-gray-600">({comments.length})</span>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                aria-label="Close comments"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-600">No comments yet</p>
                <p className="text-xs text-gray-500 mt-1">Be the first to add a comment</p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full ${
                        comment.type === 'system' ? 'bg-gray-400' : getUserColor(comment.user_initials)
                      } flex items-center justify-center text-white text-xs font-medium`}
                    >
                      {comment.user_initials}
                    </div>

                    {/* Comment Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-950">{comment.user}</span>
                        <span className="text-xs text-gray-500">{formatTimestamp(comment.timestamp)}</span>
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 ${
                          comment.type === 'system'
                            ? 'bg-gray-100 text-gray-700 italic'
                            : 'bg-purple-50 text-gray-950'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{comment.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={commentsEndRef} />
              </div>
            )}
          </div>

          {/* Input Section */}
          <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={newComment}
                onChange={handleTextareaInput}
                onKeyDown={handleKeyDown}
                placeholder="Add a comment... (Cmd/Ctrl + Enter to send)"
                className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-950 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-h-[40px] max-h-[120px]"
                rows={1}
              />
              <button
                onClick={handleSendComment}
                disabled={!newComment.trim()}
                className="flex-shrink-0 px-4 py-2 bg-purple-900 text-white rounded-lg hover:bg-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2"
                aria-label="Send comment"
              >
                <Send className="h-4 w-4" />
                <span className="text-sm font-medium">Send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Cmd/Ctrl + Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}