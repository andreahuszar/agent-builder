'use client';

import React from 'react';
import { formatBillToAddress } from '@/app/lib/addressFormatter';

interface BillToSectionProps {
  invoice: any;
  label?: string;
  className?: string;
}

export function BillToSection({ invoice, label = 'Bill To', className = '' }: BillToSectionProps) {
  return (
    <div className={`mb-8 p-4 bg-gray-50 rounded-lg ${className}`}>
      <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">{label}:</h3>
      <div className="text-sm">
        {invoice.bill_to_snapshot ? (() => {
          const billTo = formatBillToAddress(invoice.bill_to_snapshot);
          return (
            <>
              <p className="font-semibold text-gray-900">{billTo.companyName}</p>
              {billTo.addressLines.map((line, index) => (
                <p key={index} className="text-gray-600">{line}</p>
              ))}
              {billTo.taxId && (
                <p className="text-gray-600 mt-2">Client's TRN Number: {billTo.taxId}</p>
              )}
              {invoice.bill_to_snapshot.email && (
                <p className="text-gray-600">Email: {invoice.bill_to_snapshot.email}</p>
              )}
              {invoice.bill_to_snapshot.phone && (
                <p className="text-gray-600">Phone: {invoice.bill_to_snapshot.phone}</p>
              )}
            </>
          );
        })() : (
          <>
            <p className="font-semibold text-gray-900">Meridian Solutions Group</p>
            <p className="text-gray-600">Accounts Payable Department</p>
            <p className="text-gray-600">750 Market Street, Suite 400</p>
            <p className="text-gray-600">San Francisco, CA 94102</p>
          </>
        )}
      </div>
    </div>
  );
}
