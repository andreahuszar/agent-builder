import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import prisma from '@/lib/db/prisma';

interface InvoiceDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getInvoice(id: string) {
  try {
    // Fetch invoice header
    const invoiceHeaders = await prisma.$queryRaw`
      SELECT 
        id,
        invoice_number,
        vendor_name_snapshot,
        vendor_tax_id_snapshot,
        vendor_address_snapshot,
        invoice_date::text,
        due_date::text,
        currency,
        subtotal::float,
        tax_total::float,
        total::float,
        payment_terms_id,
        terms_text,
        created_at::text
      FROM invoice_headers
      WHERE id = ${id}::uuid
    ` as any[];

    if (!invoiceHeaders || invoiceHeaders.length === 0) {
      return null;
    }

    const invoice = invoiceHeaders[0];

    // Fetch invoice lines
    const lines = await prisma.$queryRaw`
      SELECT 
        line_no,
        description,
        qty::float,
        uom,
        unit_price::float,
        net_amount::float,
        line_total::float
      FROM invoice_lines
      WHERE invoice_id = ${id}::uuid
      ORDER BY line_no
    ` as any[];

    // Fetch attachments
    const attachments = await prisma.$queryRaw`
      SELECT 
        filename,
        storage_url
      FROM attachments
      WHERE doc_type = 'INV' AND doc_id = ${id}::uuid
      LIMIT 1
    ` as any[];

    return {
      ...invoice,
      lines: lines || [],
      attachment: attachments?.[0] || null,
    };
  } catch (error) {
    console.error('Error fetching invoice:', error);
    return null;
  }
}

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const resolvedParams = await params;
  const invoice = await getInvoice(resolvedParams.id);

  if (!invoice) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  };

  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
      {/* Back Link */}
      <div className="mb-6">
        <Link 
          href="/invoices"
          className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Invoices
        </Link>
      </div>

      {/* Invoice Header */}
      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Invoice #{invoice.invoice_number}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Created on {formatDate(invoice.created_at)}
            </p>
          </div>
          {invoice.attachment && (
            <a
              href={`/api/invoices/download/${resolvedParams.id}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Original
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vendor Information */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Vendor</h3>
            <p className="text-sm text-gray-700">{invoice.vendor_name_snapshot}</p>
            {invoice.vendor_tax_id_snapshot && (
              <p className="text-sm text-gray-500">Tax ID: {invoice.vendor_tax_id_snapshot}</p>
            )}
            {invoice.vendor_address_snapshot?.address && (
              <p className="text-sm text-gray-500 mt-1">
                {invoice.vendor_address_snapshot.address}
              </p>
            )}
          </div>

          {/* Invoice Dates */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Dates</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Date:</span>
                <span className="text-gray-700">{formatDate(invoice.invoice_date)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Due Date:</span>
                <span className="text-gray-700">{formatDate(invoice.due_date)}</span>
              </div>
            </div>
          </div>

          {/* Totals */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Totals</h3>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal:</span>
                <span className="text-gray-700">
                  {formatCurrency(invoice.subtotal, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax:</span>
                <span className="text-gray-700">
                  {formatCurrency(invoice.tax_total, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900">
                  {formatCurrency(invoice.total, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {invoice.terms_text && (
          <div className="mt-6 pt-6 border-t">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">Payment Terms</h3>
            <p className="text-sm text-gray-700">{invoice.terms_text}</p>
          </div>
        )}
      </div>

      {/* Invoice Lines */}
      {invoice.lines && invoice.lines.length > 0 && (
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line No.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UOM
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Line Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.lines.map((line: any) => (
                  <tr key={line.line_no}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {line.line_no}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {line.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {line.qty}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {line.uom}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(line.unit_price, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(line.net_amount, invoice.currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(line.line_total, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attachment Link */}
      {invoice.attachment && (
        <div className="mt-6 bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Attachment</h3>
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-gray-400" />
            <div>
              <p className="text-sm text-gray-900">{invoice.attachment.filename}</p>
              <a
                href={`/api/invoices/download/${resolvedParams.id}`}
                className="text-sm text-purple-600 hover:text-purple-700"
              >
                View original document
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}