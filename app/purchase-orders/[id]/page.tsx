import { notFound } from 'next/navigation';
import { FileText, Download } from 'lucide-react';
import prisma from '@/lib/db/prisma';
import InvoiceDetailLayout from '@/app/components/InvoiceDetailLayout';

interface PurchaseOrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getPurchaseOrder(id: string) {
  try {
    // Fetch purchase order header with vendor information
    const poHeaders = await prisma.$queryRaw`
      SELECT 
        ph.id,
        ph.po_number,
        ph.order_date::text,
        ph.currency,
        ph.status,
        ph.created_at::text,
        v.name as vendor_name,
        pt.description as payment_terms,
        oe.name as bill_to_name,
        oe.address as bill_to_address
      FROM po_headers ph
      LEFT JOIN vendors v ON ph.vendor_id = v.id
      LEFT JOIN payment_terms pt ON ph.payment_terms_id = pt.id
      LEFT JOIN org_entities oe ON ph.bill_to_id = oe.id
      WHERE ph.id = ${id}::uuid
    ` as any[];

    if (!poHeaders || poHeaders.length === 0) {
      return null;
    }

    const po = poHeaders[0];

    // Fetch purchase order lines
    const lines = await prisma.$queryRaw`
      SELECT 
        pl.line_no,
        pl.description,
        pl.qty_ordered::float,
        pl.uom,
        pl.unit_price::float,
        pl.cost_center,
        pl.gl_account,
        pl.status,
        (pl.qty_ordered * pl.unit_price)::float as line_total,
        i.name as item_description
      FROM po_lines pl
      LEFT JOIN items i ON pl.item_id = i.id
      WHERE pl.po_id = ${id}::uuid
      ORDER BY pl.line_no
    ` as any[];

    // Calculate totals
    const subtotal = lines.reduce((sum, line) => sum + line.line_total, 0);

    return {
      ...po,
      lines: lines || [],
      subtotal,
      total: subtotal, // For now, assuming no tax calculation
    };
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    return null;
  }
}

export default async function PurchaseOrderDetailPage({ params }: PurchaseOrderDetailPageProps) {
  const resolvedParams = await params;
  const purchaseOrder = await getPurchaseOrder(resolvedParams.id);

  if (!purchaseOrder) {
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

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'draft': 'bg-gray-100 text-gray-800',
      'approved': 'bg-green-100 text-green-800',
      'sent': 'bg-blue-100 text-blue-800',
      'received': 'bg-purple-100 text-purple-800',
      'closed': 'bg-gray-100 text-gray-600',
      'cancelled': 'bg-red-100 text-red-800',
    };
    
    const colorClass = statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <InvoiceDetailLayout 
      invoiceNumber={purchaseOrder.po_number}
      documentType="purchase-order"
    >
      <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Purchase Order Header */}
        <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-sm text-gray-950">
                Created on {formatDate(purchaseOrder.created_at)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Vendor Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-950 mb-2">Vendor</h3>
              <p className="text-sm text-gray-950">{purchaseOrder.vendor_name}</p>
            </div>

            {/* Order Information */}
            <div>
              <h3 className="text-sm font-semibold text-gray-950 mb-2">Order Details</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Order Date:</span>
                  <span className="text-gray-950">{formatDate(purchaseOrder.order_date)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status:</span>
                  <span>{getStatusBadge(purchaseOrder.status)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Currency:</span>
                  <span className="text-gray-950">{purchaseOrder.currency}</span>
                </div>
              </div>
            </div>

            {/* Totals */}
            <div>
              <h3 className="text-sm font-semibold text-gray-950 mb-2">Totals</h3>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal:</span>
                  <span className="text-gray-950">
                    {formatCurrency(purchaseOrder.subtotal, purchaseOrder.currency)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                  <span className="text-gray-950">Total:</span>
                  <span className="text-gray-950">
                    {formatCurrency(purchaseOrder.total, purchaseOrder.currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {purchaseOrder.payment_terms && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-950 mb-2">Payment Terms</h3>
              <p className="text-sm text-gray-950">{purchaseOrder.payment_terms}</p>
            </div>
          )}
        </div>

        {/* Purchase Order Lines */}
        {purchaseOrder.lines && purchaseOrder.lines.length > 0 && (
          <div className="bg-white shadow-sm ring-1 ring-gray-900/5 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-950">Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Line No.
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      UOM
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Unit Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Line Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {purchaseOrder.lines.map((line: any) => (
                    <tr key={line.line_no}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-950">
                        {line.line_no}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-950">
                        <div>
                          {line.item_description && (
                            <p className="font-medium">{line.item_description}</p>
                          )}
                          <p className={line.item_description ? 'text-gray-500' : ''}>{line.description}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                        {line.qty_ordered}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-950">
                        {line.uom}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                        {formatCurrency(line.unit_price, purchaseOrder.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-950 text-right">
                        {formatCurrency(line.line_total, purchaseOrder.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getStatusBadge(line.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </InvoiceDetailLayout>
  );
}