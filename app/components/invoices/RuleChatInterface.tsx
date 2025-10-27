'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Check, AlertCircle, Send } from 'lucide-react';

interface InvoiceLineData {
  qty: number;
  uom: string;
  description: string;
  unit_price: number;
  line_total: number;
}

interface POLineData {
  qty_ordered: number;
  uom: string;
  description: string;
  unit_price: number;
}

interface ParsedRule {
  naturalLanguage: string;
  fromQuantity: number;
  fromUnit: string;
  toQuantity: number;
  toUnit: string;
  isValid: boolean;
  error?: string;
}

interface Message {
  sender: 'agent' | 'user';
  text: string;
  timestamp: number;
  type?: 'assessment' | 'rule_preview' | 'modification_request' | 'final_rule' | 'error';
  parsedRule?: ParsedRule;
}

interface RuleChatInterfaceProps {
  invoiceLine: InvoiceLineData;
  poLine: POLineData;
  vendorName: string;
  onConfirm: (rule: ParsedRule) => void;
  onCancel: () => void;
}

export function RuleChatInterface({
  invoiceLine,
  poLine,
  vendorName,
  onConfirm,
  onCancel,
}: RuleChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentParsedRule, setCurrentParsedRule] = useState<ParsedRule | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate suggested rule
  const conversionFactor = poLine.qty_ordered / invoiceLine.qty;
  const suggestedRule = `1 ${invoiceLine.uom.toLowerCase()} of ${invoiceLine.description.toLowerCase()} from ${vendorName} = ${conversionFactor} ${poLine.uom.toLowerCase()}`;

  // Initial agent assessment message
  const agentAssessment = `I've detected a unit mismatch on this line item:

**Invoice Line:**
${invoiceLine.qty} ${invoiceLine.uom} - ${invoiceLine.description} @ £${invoiceLine.unit_price.toFixed(2)}/unit

**Purchase Order:**
${poLine.qty_ordered} ${poLine.uom} - ${poLine.description} @ £${poLine.unit_price.toFixed(2)}/unit

The financial totals align (£${invoiceLine.line_total.toFixed(2)}), but the units differ.

How would you like me to handle this?`;

  // Initialize with agent assessment on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([{
        sender: 'agent',
        text: agentAssessment,
        timestamp: Date.now(),
        type: 'assessment'
      }]);
    }, 300); // Delay for animation effect

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Parse natural language rule
  const parseRule = (text: string): ParsedRule => {
    const patterns = [
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*(?:=|equals?|is)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+of\s+.*?(?:=|equals?|is)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const [, fromQtyStr, fromUnit, toQtyStr, toUnit] = match;
        const fromQuantity = parseFloat(fromQtyStr);
        const toQuantity = parseFloat(toQtyStr);

        const expectedPOQty = invoiceLine.qty * (toQuantity / fromQuantity);
        const matches = Math.abs(expectedPOQty - poLine.qty_ordered) < 0.01;

        if (!matches) {
          return {
            naturalLanguage: text,
            fromQuantity,
            fromUnit,
            toQuantity,
            toUnit,
            isValid: false,
            error: `This conversion doesn't match the line quantities. With your rule, ${invoiceLine.qty} ${fromUnit} would equal ${expectedPOQty.toFixed(2)} ${toUnit}, but the PO shows ${poLine.qty_ordered} ${toUnit}.`
          };
        }

        return {
          naturalLanguage: text,
          fromQuantity,
          fromUnit,
          toQuantity,
          toUnit,
          isValid: true
        };
      }
    }

    return {
      naturalLanguage: text,
      fromQuantity: 0,
      fromUnit: '',
      toQuantity: 0,
      toUnit: '',
      isValid: false,
      error: "I couldn't understand the conversion rule. Please use a format like '1 unit = 3 metres' or '1 unit equals 3m'."
    };
  };

  const handleChatFocus = () => {
    if (!hasInteracted) {
      // First interaction - prepopulate with suggested rule
      setChatInput(suggestedRule);
      setHasInteracted(true);
    } else if (currentParsedRule && messages[messages.length - 1]?.type === 'modification_request') {
      // Modification interaction - prepopulate with simplified suggestion
      setChatInput(`Simplify to: 1 ${invoiceLine.uom.toLowerCase()} = ${conversionFactor} ${poLine.uom.toLowerCase()}`);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isProcessing) return;

    // Add user message
    const userMessage: Message = {
      sender: 'user',
      text: chatInput,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Show processing
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Parse the rule
    const parsed = parseRule(userMessage.text);
    setCurrentParsedRule(parsed);
    setIsProcessing(false);

    // Add agent response with parsed rule
    if (parsed.isValid) {
      const rulePreviewMessage: Message = {
        sender: 'agent',
        text: '', // Will be rendered as rule preview component
        timestamp: Date.now(),
        type: 'rule_preview',
        parsedRule: parsed
      };
      setMessages(prev => [...prev, rulePreviewMessage]);
    } else {
      const errorMessage: Message = {
        sender: 'agent',
        text: parsed.error || 'Unable to parse rule',
        timestamp: Date.now(),
        type: 'error',
        parsedRule: parsed
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleModifyRule = () => {
    const modificationMessage: Message = {
      sender: 'agent',
      text: "Ok, what should I change?",
      timestamp: Date.now(),
      type: 'modification_request'
    };
    setMessages(prev => [...prev, modificationMessage]);

    // Focus chat for user input
    chatInputRef.current?.focus();
  };

  const handleFinalConfirm = () => {
    if (currentParsedRule && currentParsedRule.isValid) {
      onConfirm(currentParsedRule);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 animate-fadeIn ${message.sender === 'user' ? 'justify-end' : ''}`}
          >
            {message.sender === 'agent' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              </div>
            )}
            <div className={`flex-1 ${message.sender === 'user' ? 'flex justify-end' : ''}`}>
              {message.sender === 'agent' && message.type === 'assessment' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-w-[85%]">
                  <div className="text-sm font-medium text-purple-900 mb-2">Agent</div>
                  <div className="text-xs text-gray-950 whitespace-pre-line">{message.text}</div>
                </div>
              )}

              {message.sender === 'agent' && message.type === 'modification_request' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-w-[85%]">
                  <div className="text-sm font-medium text-purple-900 mb-2">Agent</div>
                  <div className="text-xs text-gray-950">{message.text}</div>
                </div>
              )}

              {message.sender === 'agent' && message.type === 'rule_preview' && message.parsedRule && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-[85%]">
                  <div className="text-sm font-medium text-purple-900 mb-2">Agent</div>
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <div className="text-sm font-medium text-green-900">Rule Understood!</div>
                  </div>
                  <div className="text-xs text-gray-950 space-y-2">
                    <p className="font-medium">I understood your rule as:</p>
                    <p className="bg-white border border-green-200 rounded px-2 py-1">
                      {message.parsedRule.fromQuantity} {message.parsedRule.fromUnit} = {message.parsedRule.toQuantity} {message.parsedRule.toUnit}
                    </p>
                    <p className="font-medium mt-3">This means:</p>
                    <div className="space-y-1 pl-3">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>This line: {invoiceLine.qty} {message.parsedRule.fromUnit} = {poLine.qty_ordered} {message.parsedRule.toUnit} ✓</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>Total matches: £{invoiceLine.line_total.toFixed(2)} = £{(poLine.qty_ordered * poLine.unit_price).toFixed(2)} ✓</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600" />
                        <span>Will apply to future invoices from {vendorName}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={handleModifyRule}
                      className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Modify Rule
                    </button>
                    <button
                      onClick={handleFinalConfirm}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                    >
                      ✓ Confirm & Apply Rule
                    </button>
                  </div>
                </div>
              )}

              {message.sender === 'agent' && message.type === 'error' && message.parsedRule && (
                <div className="bg-red-50 border border-red-300 rounded-lg p-3 max-w-[85%]">
                  <div className="text-sm font-medium text-purple-900 mb-2">Agent</div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div className="text-sm font-medium text-red-900">Unable to Parse Rule</div>
                  </div>
                  <div className="text-xs text-gray-950 mb-3">
                    {message.text}
                  </div>
                  <button
                    onClick={() => chatInputRef.current?.focus()}
                    className="w-full px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {message.sender === 'user' && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 max-w-[85%]">
                  <div className="text-xs text-gray-950">{message.text}</div>
                </div>
              )}
            </div>
            {message.sender === 'user' && (
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Processing Animation */}
        {isProcessing && (
          <div className="flex gap-3 animate-fadeIn">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-600 animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                  <span className="text-xs text-gray-600">Analyzing rule...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Always at Bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
        <div className="relative">
          <textarea
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={handleChatFocus}
            onKeyPress={handleKeyPress}
            placeholder="Type your message or let me suggest a rule..."
            className="w-full min-h-[48px] max-h-[120px] px-3 py-2 pr-16 text-sm border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isProcessing}
            className="absolute right-2 bottom-2 p-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
