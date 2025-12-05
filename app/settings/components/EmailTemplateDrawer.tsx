'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Save, RotateCcw } from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'exception' | 'approval' | 'notification' | 'custom';
}

interface EmailTemplateDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSave: () => void;
  onReset: () => void;
  isModified: boolean;
}

export function EmailTemplateDrawer({
  isOpen,
  onClose,
  template,
  subject,
  body,
  onSubjectChange,
  onBodyChange,
  onSave,
  onReset,
  isModified,
}: EmailTemplateDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // Available template variables
  const variables = [
    '{{invoice_number}}',
    '{{vendor_name}}',
    '{{amount}}',
    '{{invoice_date}}',
    '{{due_date}}',
    '{{recipient_name}}',
    '{{department}}',
    '{{exception_type}}',
    '{{match_status}}',
  ];

  if (!isMounted || (!isOpen && !isVisible)) return null;

  return createPortal(
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 10001 }}>
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 pointer-events-auto ${
          isVisible ? 'bg-opacity-30' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`absolute right-0 top-0 h-full w-[500px] bg-white shadow-2xl transform transition-transform duration-300 ease-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-950">Email Template</h3>
                  <p className="text-sm text-gray-500">{template?.name || 'Custom Template'}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => onSubjectChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
                placeholder="Enter email subject..."
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Body
              </label>
              <textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm font-mono"
                placeholder="Enter email body..."
              />
            </div>

            {/* Available Variables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available Variables
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Click to copy. These will be replaced with actual values when the email is sent.
              </p>
              <div className="flex flex-wrap gap-2">
                {variables.map((variable) => (
                  <button
                    key={variable}
                    onClick={() => navigator.clipboard.writeText(variable)}
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors font-mono"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 flex-shrink-0 bg-gray-50">
            <div className="flex items-center justify-between">
              <button
                onClick={onReset}
                disabled={!isModified}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Default
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onSave();
                    handleClose();
                  }}
                  className="px-4 py-2 text-sm bg-purple-900 text-white rounded-lg hover:bg-purple-800 transition-colors inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default EmailTemplateDrawer;
