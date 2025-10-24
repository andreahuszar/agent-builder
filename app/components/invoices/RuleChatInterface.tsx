'use client';

import React, { useState } from 'react';
import { Bot, User, Check, X, AlertCircle } from 'lucide-react';

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
  const [step, setStep] = useState<'initial' | 'input' | 'preview'>('initial');
  const [userInput, setUserInput] = useState('');
  const [parsedRule, setParsedRule] = useState<ParsedRule | null>(null);

  // Calculate suggested rule
  const conversionFactor = poLine.qty_ordered / invoiceLine.qty;
  const suggestedRule = `1 ${invoiceLine.uom.toLowerCase()} of ${invoiceLine.description.toLowerCase()} from ${vendorName} = ${conversionFactor} ${poLine.uom.toLowerCase()}`;

  // Initial system message
  const systemMessage = `I noticed a unit mismatch on this line:

• Invoice: ${invoiceLine.qty} ${invoiceLine.uom} of ${invoiceLine.description}
• PO: ${poLine.qty_ordered} ${poLine.uom} of ${poLine.description}

The quantities match financially (£${invoiceLine.line_total.toFixed(2)} = £${(poLine.qty_ordered * poLine.unit_price).toFixed(2)}), but the units differ.

Can you teach me the conversion? For example:
"${suggestedRule}"`;

  // Parse natural language rule
  const parseRule = (text: string): ParsedRule => {
    // Simple parsing logic - looks for patterns like "1 unit = 3 metres" or "30 units equals 90m"
    const patterns = [
      // Pattern 1: "1 unit = 3 metres"
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*(?:=|equals?|is)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
      // Pattern 2: "1 unit of X from vendor = 3 metres"
      /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+of\s+.*?(?:=|equals?|is)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const [, fromQtyStr, fromUnit, toQtyStr, toUnit] = match;
        const fromQuantity = parseFloat(fromQtyStr);
        const toQuantity = parseFloat(toQtyStr);

        // Validate the conversion makes sense
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

  const handleConfirmSuggested = () => {
    setUserInput(suggestedRule);
    const parsed = parseRule(suggestedRule);
    setParsedRule(parsed);
    setStep('preview');
  };

  const handleTypeOwn = () => {
    setUserInput(suggestedRule); // Pre-fill with suggestion
    setStep('input');
  };

  const handleSubmitInput = () => {
    const parsed = parseRule(userInput);
    setParsedRule(parsed);
    setStep('preview');
  };

  const handleFinalConfirm = () => {
    if (parsedRule && parsedRule.isValid) {
      onConfirm(parsedRule);
    }
  };

  const handleEditRule = () => {
    setStep('input');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {/* System Message */}
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Bot className="h-4 w-4 text-purple-600" />
            </div>
          </div>
          <div className="flex-1">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <div className="text-sm font-medium text-purple-900 mb-1">System</div>
              <div className="text-xs text-gray-950 whitespace-pre-line">{systemMessage}</div>
            </div>
          </div>
        </div>

        {/* User Input Step */}
        {step === 'input' && (
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <User className="h-4 w-4 text-gray-600" />
              </div>
            </div>
            <div className="flex-1">
              <div className="bg-white border border-gray-300 rounded-lg p-3">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type your conversion rule in plain English..."
                  className="w-full min-h-[80px] text-xs text-gray-950 border-none outline-none resize-none"
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={handleSubmitInput}
                    disabled={!userInput.trim()}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Preview Rule
                  </button>
                  <button
                    onClick={onCancel}
                    className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Step */}
        {step === 'preview' && parsedRule && (
          <>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className="bg-white border border-gray-300 rounded-lg p-3">
                  <div className="text-xs text-gray-950">{parsedRule.naturalLanguage}</div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <div className="flex-1">
                <div className={`border rounded-lg p-3 ${
                  parsedRule.isValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-300'
                }`}>
                  {parsedRule.isValid ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <div className="text-sm font-medium text-green-900">Rule Understood!</div>
                      </div>
                      <div className="text-xs text-gray-950 space-y-2">
                        <p className="font-medium">I understood your rule as:</p>
                        <p className="bg-white border border-green-200 rounded px-2 py-1">
                          {parsedRule.fromQuantity} {parsedRule.fromUnit} = {parsedRule.toQuantity} {parsedRule.toUnit}
                        </p>
                        <p className="font-medium mt-3">This means:</p>
                        <div className="space-y-1 pl-3">
                          <div className="flex items-center gap-1.5">
                            <Check className="h-3 w-3 text-green-600" />
                            <span>This line: {invoiceLine.qty} {parsedRule.fromUnit} = {poLine.qty_ordered} {parsedRule.toUnit} ✓</span>
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
                          onClick={handleEditRule}
                          className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Edit Rule
                        </button>
                        <button
                          onClick={handleFinalConfirm}
                          className="flex-1 px-3 py-1.5 text-xs font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
                        >
                          ✓ Confirm & Apply Rule
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <div className="text-sm font-medium text-red-900">Unable to Parse Rule</div>
                      </div>
                      <div className="text-xs text-gray-950 mb-3">
                        {parsedRule.error}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleEditRule}
                          className="flex-1 px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Try Again
                        </button>
                        <button
                          onClick={onCancel}
                          className="px-3 py-1.5 text-xs font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Initial Quick Actions */}
      {step === 'initial' && (
        <div className="border-t border-gray-200 pt-4 space-y-2">
          <button
            onClick={handleConfirmSuggested}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-purple-900 text-white rounded-md hover:bg-purple-800 transition-colors"
          >
            <Check className="h-4 w-4" />
            Confirm Suggested Rule
          </button>
          <button
            onClick={handleTypeOwn}
            className="w-full px-4 py-2.5 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Type My Own Rule
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
