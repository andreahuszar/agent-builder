'use client';

import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { CandidatePopover } from './CandidatePopover';

interface Candidate {
  value: string;
  confidence: number;
  source: string;
  reason?: string;
}

interface OCRExtraction {
  value: any;
  confidence: number;
  candidates?: Candidate[];
  bbox?: any;
  source?: string;
}

interface EditableFieldProps {
  fieldName: string;
  value: React.ReactNode;
  invoice: any;
  onAccept: (fieldName: string, value: string) => void;
  onReject: (fieldName: string) => void;
  className?: string;
  showAsUnconfirmed?: boolean; // Visual indicator that this is an AI-suggested value
  isFocused?: boolean; // Highlight when Details tab card is open
}

export function EditableField({
  fieldName,
  value,
  invoice,
  onAccept,
  onReject,
  className = '',
  showAsUnconfirmed = false,
  isFocused = false,
}: EditableFieldProps) {
  const [showPopover, setShowPopover] = useState(false);

  // Get OCR extraction data for this field
  const ocrExtraction: OCRExtraction | undefined = invoice.ocr_extractions?.[fieldName];
  const candidates = ocrExtraction?.candidates || [];
  const hasCandidate = candidates.length > 0;

  // Get the first/best candidate
  const candidate = hasCandidate ? candidates[0] : null;

  // If no candidate, render as normal field
  if (!hasCandidate || !candidate) {
    return <span className={className}>{value}</span>;
  }

  const handleTogglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopover(!showPopover);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleTogglePopover}
        className={`
          group inline-flex items-center gap-1 cursor-pointer hover:bg-orange-50 rounded px-1 -mx-1 transition-all
          ${(isFocused || showPopover) ? 'ring-4 ring-orange-500 ring-offset-2 bg-orange-50' : ''}
          ${className}
        `.trim()}
        type="button"
      >
        <span
          className={`
            ${showPopover ? 'text-orange-700' : ''}
            ${showAsUnconfirmed ? 'border-b-2 border-dashed border-orange-400 bg-orange-50 px-1 rounded' : ''}
          `.trim()}
        >
          {value}
        </span>
        <Sparkles
          className={`h-3 w-3 transition-all ${
            showPopover
              ? 'text-orange-600 scale-110'
              : 'text-orange-500 group-hover:scale-110 group-hover:text-orange-600 animate-pulse'
          }`}
        />
      </button>

      {showPopover && (
        <CandidatePopover
          candidate={candidate}
          onAccept={() => onAccept(fieldName, candidate.value)}
          onReject={() => onReject(fieldName)}
          onClose={() => setShowPopover(false)}
        />
      )}
    </div>
  );
}
