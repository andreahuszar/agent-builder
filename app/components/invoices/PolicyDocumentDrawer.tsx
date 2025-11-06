'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Shield, AlertTriangle } from 'lucide-react';

interface PolicyDocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  policyLink?: string;
  highlightSections?: string[]; // Array of section IDs to highlight
}

export function PolicyDocumentDrawer({
  isOpen,
  onClose,
  policyLink = '/policies/global-procurement',
  highlightSections = ['high-risk-jurisdictions', 'amount-thresholds', 'approval-requirements']
}: PolicyDocumentDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const firstHighlightRef = useRef<HTMLDivElement>(null);

  // Set mounted flag after hydration
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Trigger visibility animation when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      // Scroll to first highlighted section after animation
      setTimeout(() => {
        if (firstHighlightRef.current && scrollContainerRef.current) {
          firstHighlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);
    }
  }, [isOpen]);

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

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Don't render until mounted
  if (!isMounted) return null;

  // Don't render at all when closed
  if (!isOpen && !isVisible) return null;

  const shouldHighlight = (sectionId: string) => {
    return highlightSections.includes(sectionId);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Drawer with slide transition */}
      <div
        data-drawer="policy-document"
        className={`absolute right-0 top-0 h-full w-[600px] bg-white shadow-2xl transform transition-transform duration-200 ease-in-out pointer-events-auto ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-2.5 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                  aria-label="Close drawer"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-950">
                    Global Procurement & Vendor Payment Policy
                  </h2>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div ref={scrollContainerRef} className="h-full overflow-y-auto p-6 bg-gray-50">
              {/* Document container - scaled to fit drawer */}
              <div className="bg-white shadow-lg mx-auto" style={{ maxWidth: '540px', width: '100%', minHeight: '1123px' }}>
                <div className="p-12">
                  {/* Document Header */}
                  <div className="mb-8 pb-6 border-b-2 border-purple-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-6 w-6 text-purple-600" />
                      <h1 className="text-2xl font-bold text-gray-950">
                        Global Procurement & Vendor Payment Policy
                      </h1>
                    </div>
                    <p className="text-sm text-gray-600">
                      Version 2.1 | Effective Date: January 1, 2025 | Last Updated: December 2024
                    </p>
                  </div>

                  {/* Policy Overview */}
                  <div className="mb-6">
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">1. Policy Overview</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      This policy establishes the framework for vendor payments and procurement activities across all entities.
                      It is designed to ensure compliance with international regulations, mitigate financial and reputational risks,
                      and maintain the highest standards of business integrity.
                    </p>
                    <p className="text-sm text-gray-950 leading-relaxed">
                      All employees, contractors, and agents involved in procurement or vendor payment processes must adhere
                      to this policy without exception.
                    </p>
                  </div>

                  {/* High-Risk Jurisdictions - HIGHLIGHTED */}
                  <div
                    id="high-risk-jurisdictions"
                    className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">2. High-Risk Jurisdictions</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      Transactions with vendors operating in or payments directed to high-risk jurisdictions require
                      enhanced due diligence and additional approvals. High-risk jurisdictions include, but are not limited to:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-950 space-y-1 mb-3 ml-4">
                      <li>Countries subject to international sanctions or embargoes</li>
                      <li>Jurisdictions identified by FATF as high-risk or non-cooperative</li>
                      <li className="font-semibold">
                        <mark ref={firstHighlightRef} className="bg-yellow-200 px-0.5">Russia, Belarus, North Korea, Iran, Syria, Cuba, Venezuela</mark>
                      </li>
                      <li>Any territory designated by the Compliance team as requiring special monitoring</li>
                    </ul>
                    <p className="text-sm text-gray-950 leading-relaxed">
                      ⚠️ <mark className="bg-yellow-200 px-0.5 font-semibold">All payments to vendors in these jurisdictions must be reviewed and approved by the Compliance Officer before processing.</mark>
                    </p>
                  </div>

                  {/* Amount Thresholds - HIGHLIGHTED */}
                  <div
                    id="amount-thresholds"
                    className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">3. Payment Amount Thresholds</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      Payment thresholds trigger additional review and approval requirements based on the invoice value
                      and destination jurisdiction:
                    </p>
                    <div className="space-y-2 mb-3">
                      <div className="text-sm text-gray-950 bg-white p-3 rounded border border-gray-200">
                        <span className="font-semibold">Standard Jurisdictions:</span>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>Under £50,000: Standard approval process</li>
                          <li>£50,000 - £250,000: Finance Director approval required</li>
                          <li>Over £250,000: CFO approval required</li>
                        </ul>
                      </div>
                      <div className="text-sm text-gray-950 bg-white p-3 rounded border border-gray-200">
                        <span className="font-semibold">High-Risk Jurisdictions:</span>
                        <ul className="list-disc list-inside ml-4 mt-1">
                          <li>
                            <mark className="bg-yellow-200 px-0.5 font-semibold">Under £100,000: Compliance Officer + Finance Director approval</mark>
                          </li>
                          <li>
                            <mark className="bg-yellow-200 px-0.5 font-semibold">Over £100,000: Compliance Officer + CFO approval + Board notification</mark>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <p className="text-sm text-gray-950 leading-relaxed">
                      ⚠️ <mark className="bg-yellow-200 px-0.5 font-semibold">Payments to high-risk jurisdictions exceeding £100,000 are automatically placed on compliance hold and require explicit sign-off from authorized signatories.</mark>
                    </p>
                  </div>

                  {/* Approval Requirements - HIGHLIGHTED */}
                  <div
                    id="approval-requirements"
                    className="mb-6 p-4 rounded-lg border border-gray-200 bg-gray-50"
                  >
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">4. Required Approvals</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      The following approval matrix applies to all vendor payments:
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border border-gray-300">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Scenario</th>
                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Required Approvers</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="border border-gray-300 px-3 py-2 font-medium">
                              <mark className="bg-yellow-200 px-0.5">High-risk jurisdiction + Over £100K</mark>
                            </td>
                            <td className="border border-gray-300 px-3 py-2">
                              <mark className="bg-yellow-200 px-0.5">Finance Director → Compliance Officer → CFO</mark>
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-gray-300 px-3 py-2">High-risk jurisdiction + Under £100K</td>
                            <td className="border border-gray-300 px-3 py-2">
                              Finance Director → Compliance Officer
                            </td>
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-gray-300 px-3 py-2">Standard jurisdiction + Over £250K</td>
                            <td className="border border-gray-300 px-3 py-2">CFO</td>
                          </tr>
                          <tr className="bg-white">
                            <td className="border border-gray-300 px-3 py-2">Standard jurisdiction + £50K-£250K</td>
                            <td className="border border-gray-300 px-3 py-2">Finance Director</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Due Diligence Procedures */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">5. Due Diligence Procedures</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      Enhanced due diligence must be performed for all high-risk transactions, including:
                    </p>
                    <ul className="list-disc list-inside text-sm text-gray-950 space-y-1 ml-4">
                      <li>Verification of vendor identity and business registration</li>
                      <li>Review of beneficial ownership structure</li>
                      <li>Sanctions screening against international watchlists</li>
                      <li>Assessment of vendor reputation and business practices</li>
                      <li>Confirmation of goods/services delivery and invoice legitimacy</li>
                    </ul>
                  </div>

                  {/* Compliance Review Process */}
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-950 mb-3">6. Compliance Review Process</h2>
                    <p className="text-sm text-gray-950 leading-relaxed mb-3">
                      When a payment triggers a compliance hold, the following process must be followed:
                    </p>
                    <ol className="list-decimal list-inside text-sm text-gray-950 space-y-2 ml-4">
                      <li>
                        <span className="font-semibold">Automatic Pause:</span> Payment processing is automatically paused
                        and the Compliance team is notified.
                      </li>
                      <li>
                        <span className="font-semibold">Documentation Review:</span> Compliance Officer reviews all supporting
                        documentation and conducts due diligence checks.
                      </li>
                      <li>
                        <span className="font-semibold">Risk Assessment:</span> A formal risk assessment is prepared documenting
                        findings and recommendations.
                      </li>
                      <li>
                        <span className="font-semibold">Approval Decision:</span> Required approvers review and provide
                        explicit approval or rejection.
                      </li>
                      <li>
                        <span className="font-semibold">Payment Release:</span> Upon approval, payment is released for processing
                        with full audit trail maintained.
                      </li>
                    </ol>
                  </div>

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="font-semibold">Policy Owner:</span> Chief Financial Officer<br />
                      <span className="font-semibold">Review Frequency:</span> Annual or as required by regulatory changes<br />
                      <span className="font-semibold">Questions?</span> Contact the Compliance team at compliance@company.com
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
