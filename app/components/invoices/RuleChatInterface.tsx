'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Bot, User, Check, AlertCircle, Send, Zap, RefreshCw } from 'lucide-react';
import { SecondaryButton } from '../ui/SecondaryButton';

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
  const [showAnalyzing, setShowAnalyzing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [revealedWords, setRevealedWords] = useState(0);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Calculate suggested rule
  const conversionFactor = poLine.qty_ordered / invoiceLine.qty;
  const suggestedRule = `Based on the quantities, 1 ${invoiceLine.uom.toLowerCase().replace(/s$/, '')} equals ${conversionFactor} ${poLine.uom.toLowerCase()}`;

  // Assessment message content as plain text for typewriter
  const assessmentText = `I've detected a unit mismatch on this line item. The financial totals align (£${invoiceLine.line_total.toFixed(2)}), but the units differ. How would you like me to handle this?`;

  // Split text into words for typewriter effect
  const assessmentWords = assessmentText.split(' ');

  // Structured assessment content renderer
  const renderAssessmentContent = (showTypewriter: boolean) => {
    const displayText = showTypewriter
      ? assessmentWords.slice(0, revealedWords).join(' ')
      : assessmentText;

    const showCursor = showTypewriter && isTyping && revealedWords < assessmentWords.length;

    return (
      <div className="text-xs text-gray-950 space-y-3">
        <p>
          {displayText}
          {showCursor && <span className="animate-pulse ml-0.5">▊</span>}
        </p>

        {!showTypewriter && (
          <>
            <div className="bg-white border border-purple-200 rounded px-3 py-2 space-y-1.5 animate-slideUp" style={{animationDelay: '0ms'}}>
              <p className="font-medium text-gray-900">Invoice Line</p>
              <p className="text-gray-950">@ £{invoiceLine.unit_price.toFixed(2)}/unit</p>
              <p className="text-gray-950">
                {invoiceLine.qty} {invoiceLine.uom} - {invoiceLine.description}
              </p>
            </div>

            <div className="bg-white border border-purple-200 rounded px-3 py-2 space-y-1.5 animate-slideUp" style={{animationDelay: '150ms'}}>
              <p className="font-medium text-gray-900">PO Line</p>
              <p className="text-gray-950">@ £{poLine.unit_price.toFixed(2)}/{poLine.uom.toLowerCase().replace(/s$/, '')}</p>
              <p className="text-gray-950">
                {poLine.qty_ordered} {poLine.uom} - {poLine.description}
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  // Initialize with loading state then assessment
  useEffect(() => {
    // Show "Analyzing..." after 500ms
    const analyzingTimer = setTimeout(() => {
      setShowAnalyzing(true);
    }, 500);

    // After 2000ms total, hide analyzing and start typewriter
    const assessmentTimer = setTimeout(() => {
      setShowAnalyzing(false);

      // Start typewriter effect after brief pause
      setTimeout(() => {
        setMessages([{
          sender: 'agent',
          text: assessmentText,
          timestamp: Date.now(),
          type: 'assessment'
        }]);
        setIsTyping(true);
      }, 400);
    }, 2000);

    return () => {
      clearTimeout(analyzingTimer);
      clearTimeout(assessmentTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Typewriter effect - reveal words progressively
  useEffect(() => {
    if (isTyping && revealedWords < assessmentWords.length) {
      const timer = setTimeout(() => {
        setRevealedWords(prev => prev + 1);
      }, 50); // 50ms per word

      return () => clearTimeout(timer);
    } else if (revealedWords >= assessmentWords.length) {
      // Typewriter complete
      setIsTyping(false);
    }
  }, [isTyping, revealedWords, assessmentWords.length]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, showAnalyzing, revealedWords]);

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

    // Simulate processing delay (doubled for rule interpretation)
    await new Promise(resolve => setTimeout(resolve, 4000));

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
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Welcome Message - Always visible */}
        <div className="flex gap-3 animate-fadeIn">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-purple-100 rounded-lg px-4 py-3 max-w-[85%]">
              <div className="text-xs text-gray-950">
                Agent will help you create a matching rule. Analyzing the invoice and PO lines...
              </div>
            </div>
          </div>
        </div>

        {/* Analyzing State */}
        {showAnalyzing && (
          <div className="flex gap-3 animate-fadeIn">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-purple-600 animate-pulse" />
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-purple-100 rounded-lg px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                  <span className="text-xs text-gray-950">Analyzing...</span>
                </div>
              </div>
            </div>
          </div>
        )}

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
                <div className="bg-purple-100 rounded-lg px-4 py-3 max-w-[85%]">
                  {renderAssessmentContent(isTyping)}
                </div>
              )}

              {message.sender === 'agent' && message.type === 'modification_request' && (
                <div className="bg-purple-100 rounded-lg px-4 py-3 max-w-[85%]">
                  <div className="text-xs text-gray-950">{message.text}</div>
                </div>
              )}

              {message.sender === 'agent' && message.type === 'rule_preview' && message.parsedRule && (
                <div className="bg-green-100 rounded-lg px-4 py-3 max-w-[85%]">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="h-4 w-4 text-green-600" />
                    <div className="text-xs font-semibold text-green-900">Creating Conversion Rule</div>
                  </div>

                  <div className="text-xs text-gray-950 space-y-3">
                    {/* WHEN Section */}
                    <div>
                      <p className="font-bold text-gray-900 mb-1">WHEN we receive:</p>
                      <div className="pl-2 space-y-0.5">
                        <div className="flex items-start gap-1.5">
                          <span className="text-gray-600">•</span>
                          <span>{invoiceLine.description}</span>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <span className="text-gray-600">•</span>
                          <span>From: {vendorName}</span>
                        </div>
                      </div>
                    </div>

                    {/* CONVERT Section */}
                    <div>
                      <p className="font-bold text-gray-900 mb-1">CONVERT:</p>
                      <p className="bg-white border border-green-200 rounded px-2 py-1 font-medium">
                        {message.parsedRule.fromQuantity} {message.parsedRule.fromUnit} = {message.parsedRule.toQuantity} {message.parsedRule.toUnit}
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-green-200"></div>

                    {/* Validation Section */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>Current line: {invoiceLine.qty} {message.parsedRule.fromUnit} → {poLine.qty_ordered} {message.parsedRule.toUnit}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="h-3 w-3 text-green-600 flex-shrink-0" />
                        <span>Total verified: £{invoiceLine.line_total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Future Impact Section */}
                    <div className="bg-white/50 rounded px-2 py-2 flex items-start gap-2">
                      <RefreshCw className="h-3.5 w-3.5 text-green-700 flex-shrink-0 mt-0.5" />
                      <p className="text-gray-900">
                        This rule will be saved and applied automatically to future invoices
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <SecondaryButton onClick={handleModifyRule} className="text-xs">
                      Modify Rule
                    </SecondaryButton>
                    <button
                      onClick={handleFinalConfirm}
                      className="flex-1 px-3 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                    >
                      Confirm & Apply Rule
                    </button>
                  </div>
                </div>
              )}

              {message.sender === 'agent' && message.type === 'error' && message.parsedRule && (
                <div className="bg-red-100 rounded-lg px-4 py-3 max-w-[85%]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <div className="text-xs font-medium text-red-900">Unable to Parse Rule</div>
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
                <div className="bg-gray-100 rounded-lg px-4 py-3 max-w-[85%]">
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
              <div className="bg-purple-100 rounded-lg px-4 py-3 max-w-[85%]">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                  <span className="text-xs text-gray-950">Analyzing rule...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input - Always at Bottom */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="relative">
          <textarea
            ref={chatInputRef}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onFocus={handleChatFocus}
            onKeyPress={handleKeyPress}
            placeholder="Type your message or let me suggest a rule..."
            className="w-full min-h-[48px] max-h-[120px] px-3 py-2.5 pr-14 text-xs border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isProcessing}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isProcessing}
            className="absolute right-2 top-2 p-2 bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.4s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
