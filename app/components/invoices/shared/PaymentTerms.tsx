'use client';

import React from 'react';

interface PaymentTermsProps {
  invoice: any;
  getDocumentDisplayValue?: (fieldName: string, currentValue: any) => any;
  label?: string;
  className?: string;
}

export function PaymentTerms({
  invoice,
  getDocumentDisplayValue,
  label = 'Payment Terms',
  className = '',
}: PaymentTermsProps) {
  const invoiceNumber = getDocumentDisplayValue
    ? getDocumentDisplayValue('invoice_number', invoice.invoice_number)
    : invoice.invoice_number;

  return (
    <div className={`mt-8 p-4 bg-blue-50 rounded-lg ${className}`}>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">{label}</h3>
      <p className="text-sm text-gray-700">
        {invoice.terms_text || 'Net 30 - Payment due within 30 days of invoice date'}
      </p>
      <p className="text-sm text-gray-700 mt-2">
        Please reference invoice number <span className="font-semibold text-black">{invoiceNumber}</span> with your payment.
      </p>
    </div>
  );
}
