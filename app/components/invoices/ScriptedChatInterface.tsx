'use client';

import { useState, useEffect, useRef } from 'react';
import { Bot, User, Send, Loader2 } from 'lucide-react';

const AGENT_NAME = 'Unit Conversion Matching Agent';
const AGENT_STAGE = 'matching';
const AGENT_LANE = 'Unit Conversion';
const AGENT_MODE = 'auto-apply';
const AGENT_SKILLS = ['Match Documents', 'Verify Data', 'Flag Issues'];

const GENERATED_PROMPT = `ROLE: Unit Conversion Matching Agent — validates invoice line items against PO lines for JanServ by converting units of measurement and confirming total amounts match

VENDOR SCOPE: JanServ only

INPUTS:
- Invoice line items with quantities, units of measure, and totals
- Corresponding PO line items with quantities, units, and agreed totals

STEPS:
1. For each invoice line item, identify the unit of measure (e.g. kg, tonnes, litres, boxes)
2. Retrieve the corresponding PO line item and its unit of measure
3. Apply standard unit conversion factors to normalise both to a common base unit
4. Compare the converted totals — if they match within a 1% tolerance, mark the line as matched
5. If totals do not match after conversion, flag the line as a variance for manual review
6. Output a match summary per line with original units, converted values, and match status

UNIT CONVERSION EXAMPLES:
- 1 tonne = 1,000 kg
- 1 box (12 units) = 12 each
- 1 case = variable — use vendor-specific conversion table

VALIDATIONS:
- Conversion factor must exist for both units before marking as matched
- Total amounts must match within 1% tolerance after conversion
- Unknown or non-standard units must be flagged for manual review

OUTPUT:
- Match status per line: "matched", "variance", or "review"
- Original and converted units for audit trail
- Variance amount where applicable

ERROR HANDLING:
- If unit conversion factor not found → Flag for manual review, do not auto-match
- If multiple conversion factors exist → Use most conservative (lowest) value and flag for confirmation`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isPromptCard?: boolean;
}

interface ScriptedChatInterfaceProps {
  onPromptGenerated: (prompt: string, skills: string[], agentName: string, stage: string, lane: string, mode: string) => void;
}

const SCRIPT_STEPS = [
  // Step 0: opening message (shown immediately, no user input yet)
  {
    bot: "Hi! I'm your invoice processing specialist. Tell me what your agent needs to do, and I'll ask a few clarifying questions to build the perfect configuration for you.",
  },
  // Step 1: after first user message
  {
    bot: "OK, this looks like it belongs in **Stage: Matching, Lane: Unit Conversion**. I will convert units of measurement and check that the total amounts are the same between invoice and PO line items. Should this apply to all vendors, or just a specific vendor?",
  },
  // Step 2: after second user message — show prompt card
  {
    bot: null, // handled as a prompt card
  },
];

function formatBotText(text: string) {
  // Bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

export function ScriptedChatInterface({ onPromptGenerated }: ScriptedChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState(0); // 0 = waiting for first user msg, 1 = waiting for second, 2 = done
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show opening bot message on mount
  useEffect(() => {
    setIsTyping(true);
    const t = setTimeout(() => {
      setIsTyping(false);
      setMessages([{
        id: 'bot-0',
        role: 'assistant',
        content: SCRIPT_STEPS[0].bot!,
      }]);
    }, 600);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || step >= 2 || isTyping) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    if (step === 0) {
      // Respond with step 1 bot message
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: 'bot-1',
          role: 'assistant',
          content: SCRIPT_STEPS[1].bot!,
        }]);
        setStep(1);
        setTimeout(() => inputRef.current?.focus(), 100);
      }, 900);
    } else if (step === 1) {
      // Respond with the prompt card
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: 'bot-2',
          role: 'assistant',
          content: '',
          isPromptCard: true,
        }]);
        setStep(2);
        // Notify parent so Apply button activates
        onPromptGenerated(GENERATED_PROMPT, AGENT_SKILLS, AGENT_NAME, AGENT_STAGE, AGENT_LANE, AGENT_MODE);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              msg.role === 'assistant' ? 'bg-purple-100' : 'bg-gray-100'
            }`}>
              {msg.role === 'assistant'
                ? <Bot className="h-4 w-4 text-purple-600" />
                : <User className="h-4 w-4 text-gray-500" />
              }
            </div>

            {/* Bubble */}
            {msg.isPromptCard ? (
              <div className="max-w-[85%] rounded-xl border border-purple-200 bg-purple-50 px-4 py-3 text-sm">
                <p className="text-gray-950 mb-2">Got it — scoping this to <strong>JanServ</strong> only. Here's the configuration I've built:</p>
                <div className="bg-white border border-purple-200 rounded-lg px-3 py-2.5 mb-2">
                  <p className="font-semibold text-purple-900 text-sm">{AGENT_NAME}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Stage: Matching &nbsp;·&nbsp; Lane: Unit Conversion &nbsp;·&nbsp; Mode: Auto-apply &nbsp;·&nbsp; Vendor: JanServ</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-md px-3 py-2 max-h-40 overflow-y-auto">
                  <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{GENERATED_PROMPT}</pre>
                </div>
                <p className="text-xs text-purple-600 mt-2">Click <strong>Apply Prompt</strong> below to open this in Agent Builder.</p>
              </div>
            ) : (
              <div className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === 'assistant'
                  ? 'bg-purple-50 border border-purple-100 text-gray-950'
                  : 'bg-purple-900 text-white'
              }`}>
                {msg.role === 'assistant' ? formatBotText(msg.content) : msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-3 flex-row">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
            <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-2.5 flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />
              <span className="text-xs text-purple-400">Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 px-4 py-3 bg-white">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={step >= 2 || isTyping}
            placeholder={step >= 2 ? 'Configuration complete' : 'Type your message...'}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 text-gray-950"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || step >= 2 || isTyping}
            className="p-2 bg-purple-900 hover:bg-purple-800 text-white rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
