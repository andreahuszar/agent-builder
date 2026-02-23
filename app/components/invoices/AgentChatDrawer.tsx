'use client';

import { useState, useRef, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { ChatInterface, type ChatInterfaceRef } from '@/app/components/agentbuilder/ChatInterface';
import { analyzePromptForAgent } from '@/app/utils/agentPromptAnalyzer';
import type { AgentDocument } from '@/app/components/agentbuilder/AgentBuilderPage';

interface AgentChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentChatDrawer({ isOpen, onClose }: AgentChatDrawerProps) {
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [generatedSkills, setGeneratedSkills] = useState<string[]>([]);
  const [detectedStage, setDetectedStage] = useState('');
  const [detectedLane, setDetectedLane] = useState('');
  const [canApply, setCanApply] = useState(false);
  const [sessionDocuments, setSessionDocuments] = useState<AgentDocument[]>([]);
  const chatRef = useRef<ChatInterfaceRef>(null);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setGeneratedPrompt('');
      setGeneratedSkills([]);
      setDetectedStage('');
      setDetectedLane('');
      setCanApply(false);
      setSessionDocuments([]);
      // Clear chat when reopened
      setTimeout(() => {
        chatRef.current?.clearChat();
      }, 300);
    }
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const handlePromptGenerated = (prompt: string, skills: string[], documents?: AgentDocument[]) => {
    setGeneratedPrompt(prompt);
    setGeneratedSkills(skills);
    setCanApply(true);
    if (documents) {
      setSessionDocuments(documents);
    }
  };

  const handleApplyPrompt = () => {
    // Analyze prompt to suggest stage and mode
    const analysis = analyzePromptForAgent(generatedPrompt);
    
    // Use detected stage from chat or fall back to analyzer
    const stage = detectedStage || analysis.suggestedStage;
    const mode = analysis.suggestedMode;
    
    // Build URL parameters
    const params = new URLSearchParams({
      tab: 'ap-automation',
      newAgent: 'true',
      prompt: generatedPrompt,
      stage: stage,
      agentMode: mode,
      skills: generatedSkills.join(',')
    });
    
    // Add lane if detected
    if (detectedLane) {
      params.set('lane', detectedLane);
    }
    
    const url = `/settings?${params.toString()}#automation-agent-builder-2`;
    
    // Open Settings page with Agent Builder 2 tab in new window
    window.open(url, '_blank');
    
    // Close drawer
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full sm:w-[500px] bg-white shadow-2xl z-40 flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Agent</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              Describe what you want the agent to do
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            ref={chatRef}
            onPromptGenerated={handlePromptGenerated}
            onStageDetected={setDetectedStage}
            onLaneDetected={setDetectedLane}
          />
        </div>

        {/* Footer - Apply Button */}
        {canApply && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <button
              onClick={handleApplyPrompt}
              className="w-full px-4 py-2.5 bg-purple-900 hover:bg-purple-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Apply Prompt</span>
              <ExternalLink className="h-4 w-4" />
            </button>
            <p className="text-xs text-gray-500 text-center mt-2">
              Opens Agent Builder with your configuration
            </p>
          </div>
        )}
      </div>
    </>
  );
}
